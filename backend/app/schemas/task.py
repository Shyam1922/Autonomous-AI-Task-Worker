from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class TaskCreate(BaseModel):
    goal: str = Field(min_length=5, max_length=4000)


class UserRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    kind: str
    status: str
    tool_name: str
    tool_input: dict[str, Any]
    prompt: str
    response: str | None
    created_at: datetime
    resolved_at: datetime | None


class TaskEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    message: str
    data: dict[str, Any]
    created_at: datetime


class TaskSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    goal: str
    status: str
    llm_provider: str
    step_count: int
    summary: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class TaskOut(TaskSummaryOut):
    plan: list[dict[str, Any]]
    result: dict[str, Any] | None
    verification: dict[str, Any] | None
    error: str | None
    pending_request: UserRequestOut | None = None


class ApprovalDecision(BaseModel):
    decision: Literal["approve", "reject"]
    comment: str | None = Field(default=None, max_length=1000)


class InputAnswer(BaseModel):
    answer: str = Field(min_length=1, max_length=4000)


class TaskStats(BaseModel):
    total: int
    running: int
    completed: int
    needs_attention: int
