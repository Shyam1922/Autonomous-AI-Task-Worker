import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TaskStatus:
    QUEUED = "queued"
    RUNNING = "running"
    WAITING_APPROVAL = "waiting_approval"
    WAITING_INPUT = "waiting_input"
    COMPLETED = "completed"
    PARTIAL = "partial"
    BLOCKED = "blocked"
    FAILED = "failed"
    CANCELLED = "cancelled"

    ACTIVE = {QUEUED, RUNNING}
    WAITING = {WAITING_APPROVAL, WAITING_INPUT}
    TERMINAL = {COMPLETED, PARTIAL, BLOCKED, FAILED, CANCELLED}


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    goal: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default=TaskStatus.QUEUED, index=True)
    llm_provider: Mapped[str] = mapped_column(String(32))

    # Structured plan: [{"title", "success_criteria", "status"}]
    plan: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    # Full LLM conversation, kept so a paused/interrupted task can resume.
    transcript: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    step_count: Mapped[int] = mapped_column(Integer, default=0)
    # Loop bookkeeping that must survive a pause: tool results already
    # produced for the current turn, per-tool failure counts, nudges.
    state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    result: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    verification: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    events: Mapped[list["TaskEvent"]] = relationship(
        back_populates="task", cascade="all, delete-orphan", order_by="TaskEvent.id"
    )
    requests: Mapped[list["UserRequest"]] = relationship(
        back_populates="task", cascade="all, delete-orphan", order_by="UserRequest.created_at"
    )


class TaskEvent(Base):
    """Append-only audit trail. Arguments are redacted before storage."""

    __tablename__ = "task_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(48))
    message: Mapped[str] = mapped_column(Text)
    data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    task: Mapped[Task] = relationship(back_populates="events")


class UserRequest(Base):
    """Something the agent needs from the user: an approval or an answer."""

    __tablename__ = "user_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    task_id: Mapped[str] = mapped_column(ForeignKey("tasks.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # "approval" | "input"
    status: Mapped[str] = mapped_column(String(16), default="pending")
    # approval: approved / rejected; input: answered
    tool_use_id: Mapped[str] = mapped_column(String(128))
    tool_name: Mapped[str] = mapped_column(String(64))
    tool_input: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    prompt: Mapped[str] = mapped_column(Text)
    response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    task: Mapped[Task] = relationship(back_populates="requests")


class FinanceRecord(Base):
    """Records in the *simulated* company finance application."""

    __tablename__ = "demo_finance_records"
    __table_args__ = (UniqueConstraint("vendor", "invoice_number", name="uq_vendor_invoice"),)

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    vendor: Mapped[str] = mapped_column(String(200))
    invoice_number: Mapped[str] = mapped_column(String(64), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3))
    due_date: Mapped[date] = mapped_column(Date)
    source_document: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_task_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
