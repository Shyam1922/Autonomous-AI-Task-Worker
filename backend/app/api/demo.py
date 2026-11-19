"""Read-only views of the demo environment: documents and the simulated finance app."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.connection import get_db
from app.database.models import FinanceRecord
from app.services import documents, finance_app

router = APIRouter(prefix="/api", tags=["Demo environment"])


@router.get("/config")
async def get_config():
    """Non-secret runtime configuration, shown on the Settings page."""
    return {
        "app_env": settings.APP_ENV,
        "llm_provider": settings.resolved_llm_provider,
        "llm_model": settings.LLM_MODEL if settings.resolved_llm_provider == "claude" else "mock-planner",
        "llm_effort": settings.LLM_EFFORT,
        "max_steps_per_task": settings.MAX_STEPS_PER_TASK,
        "max_retries_per_step": settings.MAX_RETRIES_PER_STEP,
        "tool_timeout_seconds": settings.TOOL_TIMEOUT_SECONDS,
        "require_approval_for_writes": settings.REQUIRE_APPROVAL_FOR_WRITES,
    }


@router.get("/demo/documents")
async def list_documents():
    return documents.search_documents("")


@router.get("/demo/documents/{path}")
async def get_document(path: str):
    try:
        return {"path": path, "content": documents.read_document(path)}
    except documents.DocumentError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/demo/finance/records")
async def list_finance_records(db: AsyncSession = Depends(get_db)):
    return [finance_app.record_to_dict(r) for r in await finance_app.list_records(db)]


@router.delete("/demo/finance/records", status_code=204)
async def reset_finance_records(db: AsyncSession = Depends(get_db)):
    """Reset the simulated finance app (development only)."""
    if settings.APP_ENV != "development":
        raise HTTPException(status_code=403, detail="Only available in development")
    await db.execute(delete(FinanceRecord))
    await db.commit()
