"""End-to-end agent flows through the HTTP API, using the offline mock planner."""

from app.agent.llm import LLMError, LLMTurn, ToolCall
from app.agent.manager import manager

ACME_GOAL = (
    "Find the newest invoice from Acme Supplies in the demo documents. Extract the invoice number, "
    "amount, currency and due date, create a record in the finance application, and verify it."
)


async def create(client, goal: str) -> dict:
    resp = await client.post("/api/tasks", json={"goal": goal})
    assert resp.status_code == 201, resp.text
    return resp.json()


async def run(client, task_id: str) -> dict:
    await manager.run_inline(task_id)
    return (await client.get(f"/api/tasks/{task_id}")).json()


async def test_invoice_flow_pauses_for_approval_then_verifies(client):
    task = await create(client, ACME_GOAL)
    assert task["status"] == "queued"

    task = await run(client, task["id"])
    assert task["status"] == "waiting_approval"
    req = task["pending_request"]
    assert req["tool_name"] == "create_finance_record"
    # Picks the newest *invoice*, not the newer quotation.
    assert req["tool_input"]["invoice_number"] == "INV-1042"
    assert req["tool_input"]["amount"] == "1250.00"
    assert len(task["plan"]) >= 4

    # Nothing is written before approval.
    assert (await client.get("/api/demo/finance/records")).json() == []

    resp = await client.post(
        f"/api/tasks/{task['id']}/approvals/{req['id']}", json={"decision": "approve"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "queued"

    task = await run(client, task["id"])
    assert task["status"] == "completed", task
    assert task["verification"]["status"] == "passed"
    assert all(c["passed"] for c in task["verification"]["checks"])
    assert task["result"]["data"]["invoice_number"] == "INV-1042"

    records = (await client.get("/api/demo/finance/records")).json()
    assert [r["invoice_number"] for r in records] == ["INV-1042"]
    assert records[0]["created_by_task_id"] == task["id"]

    events = (await client.get(f"/api/tasks/{task['id']}/events")).json()
    types = [e["type"] for e in events]
    for expected in ("task_created", "plan_updated", "tool_called", "approval_requested",
                     "approval_granted", "verification_finished", "task_finished"):
        assert expected in types

    # Approving twice is rejected.
    resp = await client.post(
        f"/api/tasks/{task['id']}/approvals/{req['id']}", json={"decision": "approve"}
    )
    assert resp.status_code == 409


async def test_rejected_write_blocks_task_without_writing(client):
    task = await run(client, (await create(client, ACME_GOAL))["id"])
    req = task["pending_request"]
    await client.post(
        f"/api/tasks/{task['id']}/approvals/{req['id']}",
        json={"decision": "reject", "comment": "Not this week"},
    )
    task = await run(client, task["id"])
    assert task["status"] == "blocked"
    assert (await client.get("/api/demo/finance/records")).json() == []


async def test_second_run_does_not_create_duplicate(client):
    first = await run(client, (await create(client, ACME_GOAL))["id"])
    await client.post(
        f"/api/tasks/{first['id']}/approvals/{first['pending_request']['id']}",
        json={"decision": "approve"},
    )
    await run(client, first["id"])

    second = await run(client, (await create(client, ACME_GOAL))["id"])
    assert second["status"] == "completed"
    assert second["pending_request"] is None  # no write was attempted
    assert "already" in second["summary"]
    assert second["verification"]["status"] == "passed"
    assert len((await client.get("/api/demo/finance/records")).json()) == 1


async def test_missing_due_date_blocks_instead_of_guessing(client):
    task = await create(client, "Find the latest invoice from Initech and enter it into the finance system.")
    task = await run(client, task["id"])
    assert task["status"] == "blocked"
    assert "due_date" in task["summary"]
    assert (await client.get("/api/demo/finance/records")).json() == []


async def test_extraction_only_task_is_verified_against_source(client):
    task = await create(client, "Find the latest invoice from Globex Corporation and extract the amount and due date.")
    task = await run(client, task["id"])
    assert task["status"] == "completed"
    assert task["result"]["data"]["currency"] == "EUR"
    assert task["verification"]["status"] == "passed"


async def test_unknown_vendor_is_blocked(client):
    task = await run(client, (await create(client, "Find the latest invoice from Umbrella Corp."))["id"])
    assert task["status"] == "blocked"


async def test_cancel_waiting_task(client):
    task = await run(client, (await create(client, ACME_GOAL))["id"])
    resp = await client.post(f"/api/tasks/{task['id']}/cancel")
    assert resp.json()["status"] == "cancelled"
    assert resp.json()["pending_request"] is None
    await manager.run_inline(task["id"])  # a cancelled task never resumes
    assert (await client.get(f"/api/tasks/{task['id']}")).json()["status"] == "cancelled"
    assert (await client.post(f"/api/tasks/{task['id']}/cancel")).status_code == 409


async def test_stats_and_history(client):
    await run(client, (await create(client, ACME_GOAL))["id"])
    await run(client, (await create(client, "Find the latest invoice from Umbrella Corp."))["id"])
    stats = (await client.get("/api/tasks/stats")).json()
    assert stats == {"total": 2, "running": 0, "completed": 0, "needs_attention": 2}
    assert len((await client.get("/api/tasks")).json()) == 2


# ----------------------------------------------------------------- scripted LLMs


class ScriptedLLM:
    """Replays a fixed list of tool calls, to exercise runner edge cases."""

    name = "scripted"

    def __init__(self, calls: list[tuple[str, dict]]):
        self.calls = calls
        self.i = 0

    async def next_turn(self, system, messages, tools):
        name, args = self.calls[min(self.i, len(self.calls) - 1)]
        self.i += 1
        call = ToolCall(f"toolu_{self.i}", name, args)
        return LLMTurn([{"type": "tool_use", "id": call.id, "name": name, "input": args}], "", [call], "tool_use")


async def test_claimed_success_without_evidence_is_not_completed(client):
    task = await create(client, ACME_GOAL)
    llm = ScriptedLLM([("finish_task", {"status": "completed", "summary": "All done!"})])
    await manager.run_inline(task["id"], llm)
    task = (await client.get(f"/api/tasks/{task['id']}")).json()
    assert task["status"] == "partial"
    assert task["verification"]["status"] == "inconclusive"


async def test_false_claim_fails_verification(client):
    task = await create(client, ACME_GOAL)
    llm = ScriptedLLM([
        ("finish_task", {
            "status": "completed",
            "summary": "Extracted.",
            "data": {"invoice_number": "INV-1042", "amount": "9999.00"},
            "evidence": [{"type": "source_document", "reference": "acme_supplies_INV-1042.txt"}],
        })
    ])
    await manager.run_inline(task["id"], llm)
    task = (await client.get(f"/api/tasks/{task['id']}")).json()
    assert task["status"] == "failed"
    failed = [c for c in task["verification"]["checks"] if not c["passed"]]
    assert any("amount" in c["name"] for c in failed)


async def test_repeated_tool_failures_hit_retry_limit(client):
    task = await create(client, ACME_GOAL)
    llm = ScriptedLLM([("read_document", {"path": "../../.env"})] * 10)
    await manager.run_inline(task["id"], llm)
    task = (await client.get(f"/api/tasks/{task['id']}")).json()
    assert task["status"] == "failed"  # step limit, after policy denials
    events = (await client.get(f"/api/tasks/{task['id']}/events")).json()
    assert any("outside the approved document source" in e["message"] for e in events)
    assert any(e["type"] == "policy_denied" for e in events)


async def test_invalid_tool_input_is_reported_to_model(client):
    task = await create(client, ACME_GOAL)
    llm = ScriptedLLM([
        ("create_finance_record", {"vendor": "Acme", "amount": "lots"}),
        ("finish_task", {"status": "failed", "summary": "Could not create."}),
    ])
    await manager.run_inline(task["id"], llm)
    task = (await client.get(f"/api/tasks/{task['id']}")).json()
    assert task["status"] == "failed"
    events = (await client.get(f"/api/tasks/{task['id']}/events")).json()
    assert any(e["type"] == "tool_failed" and "Invalid tool input" in e["message"] for e in events)


async def test_llm_error_fails_task_cleanly(client):
    class BrokenLLM:
        name = "broken"

        async def next_turn(self, *args):
            raise LLMError("Could not reach the Claude API.")

    task = await create(client, ACME_GOAL)
    await manager.run_inline(task["id"], BrokenLLM())
    task = (await client.get(f"/api/tasks/{task['id']}")).json()
    assert task["status"] == "failed"
    assert task["error"] == "llm_error"
