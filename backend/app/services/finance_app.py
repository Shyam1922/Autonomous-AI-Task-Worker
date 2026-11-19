"""The *simulated* company finance application the agent writes into.

It is deliberately a separate service boundary from the agent: the agent only
reaches it through typed tools, and the verifier reads it back independently.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import FinanceRecord


def record_to_dict(record: FinanceRecord) -> dict:
    return {
        "record_id": record.id,
        "vendor": record.vendor,
        "invoice_number": record.invoice_number,
        "amount": str(Decimal(record.amount).quantize(Decimal("0.01"))),
        "currency": record.currency,
        "due_date": record.due_date.isoformat(),
        "source_document": record.source_document,
        "created_by_task_id": record.created_by_task_id,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


async def list_records(session: AsyncSession) -> list[FinanceRecord]:
    result = await session.execute(select(FinanceRecord).order_by(FinanceRecord.created_at.desc()))
    return list(result.scalars())


async def find_records(
    session: AsyncSession, invoice_number: str | None = None, vendor: str | None = None
) -> list[FinanceRecord]:
    query = select(FinanceRecord)
    if invoice_number:
        query = query.where(func.lower(FinanceRecord.invoice_number) == invoice_number.strip().lower())
    if vendor:
        query = query.where(func.lower(FinanceRecord.vendor).contains(vendor.strip().lower()))
    result = await session.execute(query.order_by(FinanceRecord.created_at.desc()))
    return list(result.scalars())


async def get_record(session: AsyncSession, record_id: str) -> FinanceRecord | None:
    return await session.get(FinanceRecord, record_id)


async def create_record(
    session: AsyncSession,
    *,
    vendor: str,
    invoice_number: str,
    amount: Decimal,
    currency: str,
    due_date: date,
    source_document: str | None,
    task_id: str | None,
) -> tuple[FinanceRecord, bool]:
    """Create a record. Idempotent on (vendor, invoice_number).

    Returns (record, created). A retry after an uncertain first attempt finds
    the existing record instead of creating a duplicate.
    """
    existing = await session.execute(
        select(FinanceRecord).where(
            func.lower(FinanceRecord.vendor) == vendor.strip().lower(),
            func.lower(FinanceRecord.invoice_number) == invoice_number.strip().lower(),
        )
    )
    if record := existing.scalar_one_or_none():
        return record, False

    count = await session.scalar(select(func.count()).select_from(FinanceRecord))
    record = FinanceRecord(
        id=f"FIN-{2001 + (count or 0)}",
        vendor=vendor.strip(),
        invoice_number=invoice_number.strip(),
        amount=amount,
        currency=currency.upper(),
        due_date=due_date,
        source_document=source_document,
        created_by_task_id=task_id,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record, True
