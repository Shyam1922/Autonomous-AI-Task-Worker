"""Independent verification of the agent's claimed outcome.

The verifier never trusts the model's summary. It re-reads the destination
system and re-parses source documents, then compares them with the values
the agent reported.
"""

import re
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import documents, finance_app

COMPARED_FIELDS = ("vendor", "invoice_number", "amount", "currency", "due_date")
_VENDOR_SUFFIXES = {"ltd", "limited", "inc", "llc", "corp", "corporation", "co", "plc", "gmbh"}


def _norm(name: str, value: Any) -> str | None:
    if value is None or value == "":
        return None
    if name == "vendor":
        words = re.sub(r"[^\w\s]", " ", str(value).lower()).split()
        return " ".join(w for w in words if w not in _VENDOR_SUFFIXES)
    if name == "amount":
        try:
            return str(Decimal(str(value).replace(",", "")).quantize(Decimal("0.01")))
        except InvalidOperation:
            return str(value)
    return str(value).strip().lower()


def _compare(label: str, expected: dict, actual: dict, checks: list[dict]) -> None:
    for name in COMPARED_FIELDS:
        exp, act = _norm(name, expected.get(name)), _norm(name, actual.get(name))
        if exp is None:
            continue
        checks.append(
            {
                "name": f"{label}: {name}",
                "passed": exp == act,
                "detail": f"expected {expected.get(name)!r}, found {actual.get(name)!r}",
            }
        )


async def verify(session: AsyncSession, report: dict[str, Any]) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    data = report.get("data") or {}

    for item in report.get("evidence") or []:
        kind, ref = item.get("type"), item.get("reference")

        if kind == "destination_record":
            record = await finance_app.get_record(session, ref)
            checks.append(
                {"name": f"Record {ref} exists", "passed": record is not None, "detail": "finance app lookup"}
            )
            if record is None:
                continue
            saved = finance_app.record_to_dict(record)
            _compare(f"Record {ref} matches report", data, saved, checks)

            if record.source_document:
                try:
                    source = documents.extract_invoice_fields(documents.read_document(record.source_document))
                    _compare(f"Record {ref} matches {record.source_document}", source.to_dict(), saved, checks)
                except documents.DocumentError as exc:
                    checks.append({"name": "Source document readable", "passed": False, "detail": str(exc)})

        elif kind == "source_document":
            try:
                source = documents.extract_invoice_fields(documents.read_document(ref))
            except documents.DocumentError as exc:
                checks.append({"name": f"{ref} readable", "passed": False, "detail": str(exc)})
                continue
            # Every value the agent reported must be supported by the document.
            _compare(f"Report matches {ref}", data, source.to_dict(), checks)

    if not checks:
        status = "inconclusive"
    elif all(c["passed"] for c in checks):
        status = "passed"
    else:
        status = "failed"

    return {"status": status, "checks": checks}
