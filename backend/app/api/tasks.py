import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.manager import manager
from app.core.config import settings
from app.database.connection import AsyncSessionLocal, get_db
from app.database.models import Task, TaskEvent, TaskStatus, UserRequest
from app.schemas.task import (
    ApprovalDecision,
    InputAnswer,
    TaskCreate,
    TaskEventOut,
    TaskOut,
    TaskStats,
    TaskSummaryOut,
    UserRequestOut,
)

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


async def _get_task(db: AsyncSession, task_id: str) -> Task:
    task = await db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


async def _task_out(db: AsyncSession, task: Task) -> TaskOut:
    pending = await db.scalar(
        select(UserRequest)
        .where(UserRequest.task_id == task.id, UserRequest.status == "pending")
        .order_by(UserRequest.created_at.desc())
    )
    out = TaskOut.model_validate(task)
    out.pending_request = UserRequestOut.model_validate(pending) if pending else None
    return out


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(body: TaskCreate, db: AsyncSession = Depends(get_db)):
    task = Task(goal=body.goal.strip(), llm_provider=settings.resolved_llm_provider, status=TaskStatus.QUEUED)
    db.add(task)
    db.add(TaskEvent(task=task, type="task_created", message="Task created", data={}))
    await db.commit()
    manager.start(task.id)
    return await _task_out(db, task)


@router.get("", response_model=list[TaskSummaryOut])
async def list_tasks(
    status: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).order_by(Task.created_at.desc()).limit(limit)
    if status:
        query = query.where(Task.status == status)
    return list(await db.scalars(query))


@router.get("/stats", response_model=TaskStats)
async def task_stats(db: AsyncSession = Depends(get_db)):
    rows = dict((await db.execute(select(Task.status, func.count()).group_by(Task.status))).all())
    return TaskStats(
        total=sum(rows.values()),
        running=sum(rows.get(s, 0) for s in TaskStatus.ACTIVE),
        completed=rows.get(TaskStatus.COMPLETED, 0),
        needs_attention=sum(rows.get(s, 0) for s in TaskStatus.WAITING | {TaskStatus.BLOCKED, TaskStatus.PARTIAL}),
    )


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)):
    return await _task_out(db, await _get_task(db, task_id))


@router.get("/{task_id}/events", response_model=list[TaskEventOut])
async def list_events(task_id: str, after: int = 0, db: AsyncSession = Depends(get_db)):
    await _get_task(db, task_id)
    query = select(TaskEvent).where(TaskEvent.task_id == task_id, TaskEvent.id > after).order_by(TaskEvent.id)
    return list(await db.scalars(query))


@router.get("/{task_id}/stream")
async def stream_task(task_id: str, request: Request, after: int = 0):
    """Server-Sent Events: `event` for each new audit event, `task` on state changes."""
    async with AsyncSessionLocal() as db:
        await _get_task(db, task_id)

    async def generator():
        last_id, last_marker = after, None
        while not await request.is_disconnected():
            async with AsyncSessionLocal() as db:
                events = list(
                    await db.scalars(
                        select(TaskEvent)
                        .where(TaskEvent.task_id == task_id, TaskEvent.id > last_id)
                        .order_by(TaskEvent.id)
                    )
                )
                for event in events:
                    last_id = event.id
                    payload = TaskEventOut.model_validate(event).model_dump_json()
                    yield f"id: {event.id}\nevent: event\ndata: {payload}\n\n"

                task = await db.get(Task, task_id)
                if task is None:
                    return
                marker = (task.status, task.updated_at, task.step_count)
                if marker != last_marker or events:
                    last_marker = marker
                    snapshot = (await _task_out(db, task)).model_dump_json()
                    yield f"event: task\ndata: {snapshot}\n\n"
                if task.status in TaskStatus.TERMINAL and not events:
                    yield "event: end\ndata: {}\n\n"
                    return
            yield ": keep-alive\n\n"
            await asyncio.sleep(0.5)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _pending_request(db: AsyncSession, task: Task, request_id: str, kind: str) -> UserRequest:
    req = await db.get(UserRequest, request_id)
    if req is None or req.task_id != task.id:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.kind != kind:
        raise HTTPException(status_code=400, detail=f"This request is a {req.kind}, not {kind}")
    if req.status != "pending":
        raise HTTPException(status_code=409, detail="This request was already resolved")
    return req


@router.post("/{task_id}/approvals/{request_id}", response_model=TaskOut)
async def decide_approval(
    task_id: str, request_id: str, body: ApprovalDecision, db: AsyncSession = Depends(get_db)
):
    task = await _get_task(db, task_id)
    req = await _pending_request(db, task, request_id, "approval")
    req.status = "approved" if body.decision == "approve" else "rejected"
    req.response = body.comment
    req.resolved_at = datetime.now(timezone.utc)
    if task.status == TaskStatus.WAITING_APPROVAL:
        task.status = TaskStatus.QUEUED
    await db.commit()
    manager.start(task.id)
    return await _task_out(db, task)


@router.post("/{task_id}/inputs/{request_id}", response_model=TaskOut)
async def answer_input(task_id: str, request_id: str, body: InputAnswer, db: AsyncSession = Depends(get_db)):
    task = await _get_task(db, task_id)
    req = await _pending_request(db, task, request_id, "input")
    req.status = "answered"
    req.response = body.answer.strip()
    req.resolved_at = datetime.now(timezone.utc)
    if task.status == TaskStatus.WAITING_INPUT:
        task.status = TaskStatus.QUEUED
    await db.commit()
    manager.start(task.id)
    return await _task_out(db, task)


@router.post("/{task_id}/cancel", response_model=TaskOut)
async def cancel_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await _get_task(db, task_id)
    if task.status in TaskStatus.TERMINAL:
        raise HTTPException(status_code=409, detail=f"Task is already {task.status}")
    task.status = TaskStatus.CANCELLED
    task.summary = "Cancelled by the user."
    task.completed_at = datetime.now(timezone.utc)
    for req in await db.scalars(
        select(UserRequest).where(UserRequest.task_id == task.id, UserRequest.status == "pending")
    ):
        req.status = "cancelled"
        req.resolved_at = task.completed_at
    db.add(TaskEvent(task_id=task.id, type="task_finished", message=task.summary, data={"status": task.status}))
    await db.commit()
    return await _task_out(db, task)


@router.post("/{task_id}/retry", response_model=TaskOut, status_code=201)
async def retry_task(task_id: str, db: AsyncSession = Depends(get_db)):
    """Start a fresh task with the same goal (the original stays in history)."""
    original = await _get_task(db, task_id)
    return await create_task(TaskCreate(goal=original.goal), db)


@router.get("/{task_id}/transcript")
async def get_transcript(task_id: str, db: AsyncSession = Depends(get_db)):
    """Raw agent conversation, for debugging. Thinking blocks are summarized/omitted by the API."""
    task = await _get_task(db, task_id)
    return json.loads(json.dumps(task.transcript, default=str))
