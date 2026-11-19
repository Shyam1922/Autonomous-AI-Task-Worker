"""Runs agent tasks in the background, one runner per task at a time."""

import asyncio
import logging

from sqlalchemy import select

from app.agent.llm import LLMClient, get_llm
from app.agent.runner import TaskRunner
from app.database.connection import AsyncSessionLocal
from app.database.models import Task, TaskEvent, TaskStatus

log = logging.getLogger("taskpilot.manager")


class TaskManager:
    def __init__(self) -> None:
        self._running: dict[str, asyncio.Task] = {}
        self.llm_factory = get_llm

    def is_running(self, task_id: str) -> bool:
        job = self._running.get(task_id)
        return job is not None and not job.done()

    def start(self, task_id: str) -> None:
        if self.is_running(task_id):
            return
        job = asyncio.create_task(self._run(task_id), name=f"task-{task_id}")
        self._running[task_id] = job
        job.add_done_callback(lambda _: self._running.pop(task_id, None))

    async def run_inline(self, task_id: str, llm: LLMClient | None = None) -> None:
        """Run a task to its next pause/finish in the current coroutine (tests, scripts)."""
        await self._run(task_id, llm)

    async def _run(self, task_id: str, llm: LLMClient | None = None) -> None:
        async with AsyncSessionLocal() as session:
            task = await session.get(Task, task_id)
            if task is None:
                return
            try:
                await TaskRunner(session, llm or self.llm_factory(), task).run()
            except Exception as exc:  # last-resort guard so a bug never leaves a task "running"
                log.exception("Runner crashed for task %s", task_id)
                await session.rollback()
                task = await session.get(Task, task_id)
                if task is not None and task.status not in TaskStatus.TERMINAL:
                    task.status = TaskStatus.FAILED
                    task.summary = "The task runner hit an unexpected error."
                    task.error = type(exc).__name__
                    session.add(
                        TaskEvent(task_id=task_id, type="task_finished", message=task.summary,
                                  data={"status": task.status})
                    )
                    await session.commit()

    async def resume_interrupted(self) -> int:
        """Resume tasks that were queued or mid-run when the server stopped."""
        async with AsyncSessionLocal() as session:
            ids = list(
                await session.scalars(select(Task.id).where(Task.status.in_(TaskStatus.ACTIVE)))
            )
        for task_id in ids:
            self.start(task_id)
        return len(ids)

    async def shutdown(self) -> None:
        jobs = list(self._running.values())
        for job in jobs:
            job.cancel()
        await asyncio.gather(*jobs, return_exceptions=True)


manager = TaskManager()
