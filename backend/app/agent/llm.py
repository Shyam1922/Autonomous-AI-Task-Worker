"""LLM provider adapters.

The runner talks to one small interface. The transcript uses the Anthropic
Messages format as the canonical shape (it is what gets persisted for
resume); the mock adapter reads the same shape.
"""

import json
import re
from dataclasses import dataclass, field
from typing import Any, Protocol

import anthropic

from app.core.config import settings


class LLMError(Exception):
    pass


@dataclass
class ToolCall:
    id: str
    name: str
    input: dict[str, Any]


@dataclass
class LLMTurn:
    content: list[dict[str, Any]]  # appended to the transcript unchanged
    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    stop_reason: str | None = None
    model: str | None = None


class LLMClient(Protocol):
    name: str

    async def next_turn(
        self, system: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]]
    ) -> LLMTurn: ...


# --------------------------------------------------------------------------- Claude


class ClaudeLLM:
    name = "claude"

    def __init__(self) -> None:
        # Without an explicit key the SDK resolves credentials from the
        # environment (ANTHROPIC_API_KEY, auth token, or an `ant` profile).
        kwargs = {"api_key": settings.ANTHROPIC_API_KEY} if settings.ANTHROPIC_API_KEY else {}
        self.client = anthropic.AsyncAnthropic(max_retries=3, **kwargs)

    async def next_turn(self, system, messages, tools) -> LLMTurn:
        try:
            response = await self.client.beta.messages.create(
                model=settings.LLM_MODEL,
                max_tokens=settings.LLM_MAX_TOKENS,
                system=system,
                messages=messages,
                tools=tools,
                thinking={"type": "adaptive"},
                output_config={"effort": settings.LLM_EFFORT},
                # The agent loop resends the whole history each step; cache it.
                cache_control={"type": "ephemeral"},
                # If a safety classifier declines, let the API re-run the turn
                # on an appropriate fallback model instead of stopping.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except anthropic.AuthenticationError as exc:
            raise LLMError("Claude API authentication failed - check ANTHROPIC_API_KEY.") from exc
        except anthropic.RateLimitError as exc:
            raise LLMError("Claude API rate limit reached after retries.") from exc
        except anthropic.BadRequestError as exc:
            raise LLMError(f"Claude API rejected the request: {exc.message}") from exc
        except anthropic.APIStatusError as exc:
            raise LLMError(f"Claude API error {exc.status_code}: {exc.message}") from exc
        except anthropic.APIConnectionError as exc:
            raise LLMError("Could not reach the Claude API.") from exc

        if response.stop_reason == "refusal":
            raise LLMError("The model declined to continue this task.")
        if response.stop_reason == "max_tokens":
            raise LLMError("The model response hit max_tokens before finishing.")

        content = [block.to_dict() for block in response.content]
        text = "\n".join(b.text for b in response.content if b.type == "text").strip()
        calls = [
            ToolCall(b.id, b.name, dict(b.input)) for b in response.content if b.type == "tool_use"
        ]
        return LLMTurn(content, text, calls, response.stop_reason, response.model)


# --------------------------------------------------------------------------- Mock


def _history(messages: list[dict[str, Any]]) -> list[tuple[str, dict, dict]]:
    """Flatten the transcript into (tool_name, input, parsed_result) in order."""
    uses: dict[str, tuple[str, dict]] = {}
    out: list[tuple[str, dict, dict]] = []
    for msg in messages:
        if not isinstance(msg.get("content"), list):
            continue
        for block in msg["content"]:
            if block.get("type") == "tool_use":
                uses[block["id"]] = (block["name"], block["input"])
            elif block.get("type") == "tool_result" and block["tool_use_id"] in uses:
                name, args = uses[block["tool_use_id"]]
                raw = block.get("content")
                if isinstance(raw, list):
                    raw = "".join(p.get("text", "") for p in raw)
                try:
                    result = json.loads(raw) if raw else {}
                except json.JSONDecodeError:
                    result = {"raw": raw}
                if block.get("is_error"):
                    result = {"error": result.get("error", raw)}
                out.append((name, args, result))
    return out


_VENDOR_RE = re.compile(r"\bfrom\s+(?:the\s+)?([A-Z][\w&.\-]*(?:\s+[A-Z][\w&.\-]*)*)")
_WRITE_WORDS = ("enter", "record", "create", "add", "save", "system", "finance")


class MockLLM:
    """Deterministic, offline planner for the invoice workflow.

    It exists so the orchestration, policy, approval, resume and verification
    paths can be developed and tested without an API key. It reads the same
    transcript a real model would and decides the next tool call from it.
    """

    name = "mock"

    def __init__(self) -> None:
        self._counter = 0

    def _call(self, thought: str, name: str, args: dict[str, Any]) -> LLMTurn:
        self._counter += 1
        call = ToolCall(f"toolu_mock_{self._counter:04d}_{name}", name, args)
        content = [
            {"type": "text", "text": thought},
            {"type": "tool_use", "id": call.id, "name": name, "input": args},
        ]
        return LLMTurn(content, thought, [call], "tool_use", "mock-planner")

    def _finish(self, thought: str, **report: Any) -> LLMTurn:
        return self._call(thought, "finish_task", report)

    async def next_turn(self, system, messages, tools) -> LLMTurn:
        goal = messages[0]["content"] if isinstance(messages[0]["content"], str) else ""
        goal = goal.split("GOAL:", 1)[-1].strip()
        history = _history(messages)
        self._counter = len(history)
        done = [h[0] for h in history]
        last = history[-1] if history else None

        vendor_match = _VENDOR_RE.search(goal)
        vendor = vendor_match.group(1).strip().rstrip(".-") if vendor_match else ""
        wants_write = any(w in goal.lower() for w in _WRITE_WORDS)

        if not history:
            steps = [
                {"title": f"Search documents for {vendor or 'the requested'} invoices",
                 "success_criteria": "Candidate invoices returned"},
                {"title": "Select the newest matching invoice",
                 "success_criteria": "Chosen by document type, vendor and date"},
                {"title": "Extract and validate invoice fields",
                 "success_criteria": "No required field missing"},
            ]
            if wants_write:
                steps += [
                    {"title": "Check the finance app for an existing record",
                     "success_criteria": "Duplicate risk understood"},
                    {"title": "Create the finance record (with approval)",
                     "success_criteria": "Record id returned"},
                    {"title": "Read the record back",
                     "success_criteria": "Saved values match the invoice"},
                ]
            steps.append({"title": "Report the outcome with evidence",
                          "success_criteria": "Verified result returned"})
            return self._call("I'll start by laying out a plan.", "update_plan", {"steps": steps})

        if "search_documents" not in done:
            return self._call(
                "Searching the approved document source.",
                "search_documents",
                {"query": f"{vendor} invoice".strip()},
            )

        search = next(r for n, _, r in history if n == "search_documents")
        if "extract_invoice_fields" not in done:
            vendor_l = vendor.lower()
            invoices = [
                r for r in search.get("results", [])
                if r["document_type"] == "invoice"
                and (not vendor_l or vendor_l in (r.get("vendor") or "").lower())
            ]
            if not invoices:
                return self._finish(
                    "No matching invoice was found, so I can't continue.",
                    status="blocked",
                    summary=f"No invoice from {vendor or 'the requested vendor'} was found in the document source.",
                    unresolved_issues=["Check the vendor name or add the invoice to the document source."],
                )
            newest = max(invoices, key=lambda r: r.get("document_date") or "")
            return self._call(
                f"The newest invoice is {newest['path']} ({newest['document_date']}). "
                "Quotes and other documents are excluded. Extracting its fields.",
                "extract_invoice_fields",
                {"path": newest["path"]},
            )

        fields = next(r for n, _, r in history if n == "extract_invoice_fields")
        data = {k: fields.get(k) for k in ("vendor", "invoice_number", "amount", "currency", "due_date")}
        source = {"type": "source_document", "reference": fields.get("path")}

        if fields.get("missing_fields"):
            missing = ", ".join(fields["missing_fields"])
            return self._finish(
                f"The invoice is missing: {missing}. I won't guess these values.",
                status="blocked",
                summary=f"Invoice {fields.get('invoice_number') or ''} is missing required fields ({missing}).".replace("  ", " "),
                data={k: v for k, v in data.items() if v},
                evidence=[source],
                unresolved_issues=[f"Provide the missing value(s): {missing}."],
            )

        if not wants_write:
            return self._finish(
                "All required fields were extracted.",
                status="completed",
                summary=f"Extracted invoice {data['invoice_number']} from {data['vendor']}: "
                        f"{data['currency']} {data['amount']} due {data['due_date']}.",
                data=data,
                evidence=[source],
            )

        if "find_finance_records" not in done:
            return self._call(
                "Checking the finance app for an existing record before writing.",
                "find_finance_records",
                {"invoice_number": data["invoice_number"]},
            )

        found = next(r for n, _, r in history if n == "find_finance_records").get("records", [])
        if found and "get_finance_record" not in done:
            return self._call(
                f"A record already exists ({found[0]['record_id']}); reading it instead of creating a duplicate.",
                "get_finance_record",
                {"record_id": found[0]["record_id"]},
            )

        if not found and "create_finance_record" not in done:
            return self._call(
                "No existing record. Creating it (this write needs your approval).",
                "create_finance_record",
                {**data, "source_document": fields["path"]},
            )

        if last and last[0] == "create_finance_record":
            if "error" in last[2]:
                return self._finish(
                    "The record was not created.",
                    status="blocked",
                    summary=f"Invoice {data['invoice_number']} was extracted but not entered: {last[2]['error']}",
                    data=data,
                    evidence=[source],
                    unresolved_issues=["The write to the finance app did not happen."],
                )
            return self._call(
                "Reading the saved record back to verify it.",
                "get_finance_record",
                {"record_id": last[2]["record"]["record_id"]},
            )

        record = next(r for n, _, r in reversed(history) if n == "get_finance_record").get("record", {})
        existed = bool(found)
        return self._finish(
            "The saved record matches the invoice.",
            status="completed",
            summary=(
                f"Invoice {data['invoice_number']} was already in the finance app as {record.get('record_id')}; no duplicate created."
                if existed
                else f"Invoice {data['invoice_number']} was added as {record.get('record_id')} and read back."
            ),
            data=data,
            evidence=[source, {"type": "destination_record", "reference": record.get("record_id")}],
        )


def get_llm() -> LLMClient:
    return ClaudeLLM() if settings.resolved_llm_provider == "claude" else MockLLM()
