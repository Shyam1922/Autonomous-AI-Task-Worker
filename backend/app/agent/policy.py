"""Decides whether a proposed tool call may run. Enforced outside the model."""

import re
from dataclasses import dataclass
from typing import Any, Literal

from app.agent.tools import TOOLS
from app.core.config import settings

Decision = Literal["allow", "require_approval", "deny"]


@dataclass
class PolicyResult:
    decision: Decision
    reason: str


def evaluate(tool_name: str, failures: dict[str, int]) -> PolicyResult:
    tool = TOOLS.get(tool_name)
    if tool is None:
        return PolicyResult("deny", f"'{tool_name}' is not an allowlisted tool.")

    if failures.get(tool_name, 0) > settings.MAX_RETRIES_PER_STEP:
        return PolicyResult(
            "deny",
            f"Retry limit reached for '{tool_name}'. Choose a different approach or finish the task "
            "as blocked/failed.",
        )

    if tool.risk == "write" and settings.REQUIRE_APPROVAL_FOR_WRITES:
        return PolicyResult("require_approval", "Write actions require user approval.")

    return PolicyResult("allow", f"{tool.risk} action")


_SECRET_KEY = re.compile(r"pass(word)?|secret|token|api[_-]?key|cookie|authorization|credential", re.I)


def redact(value: Any) -> Any:
    """Strip anything that looks like a secret before it reaches the audit trail."""
    if isinstance(value, dict):
        return {k: "[REDACTED]" if _SECRET_KEY.search(str(k)) else redact(v) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(v) for v in value]
    if isinstance(value, str) and len(value) > 4000:
        return value[:4000] + "... [truncated]"
    return value
