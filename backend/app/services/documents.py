"""Read-only access to the approved document source (synthetic invoices)."""

import re
from dataclasses import asdict, dataclass, field
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

from app.core.config import settings

SUPPORTED_SUFFIXES = {".txt", ".md"}
MAX_DOCUMENT_CHARS = 20_000


class DocumentError(Exception):
    pass


def _root() -> Path:
    return settings.DEMO_DOCUMENTS_DIR


def resolve_document(path: str) -> Path:
    """Resolve a document path, refusing anything outside the approved folder."""
    root = _root()
    candidate = (root / path).resolve()
    if not candidate.is_relative_to(root):
        raise DocumentError(f"Access denied: '{path}' is outside the approved document source.")
    if not candidate.is_file():
        raise DocumentError(f"Document not found: '{path}'.")
    if candidate.suffix.lower() not in SUPPORTED_SUFFIXES:
        raise DocumentError(f"Unsupported document type: '{candidate.suffix}'.")
    return candidate


def read_document(path: str) -> str:
    text = resolve_document(path).read_text(encoding="utf-8")
    return text[:MAX_DOCUMENT_CHARS]


def _field(text: str, *labels: str) -> str | None:
    for label in labels:
        match = re.search(rf"^\s*{re.escape(label)}\s*:\s*(.+?)\s*$", text, re.I | re.M)
        if match:
            return match.group(1)
    return None


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return None


@dataclass
class InvoiceFields:
    document_type: str
    vendor: str | None = None
    invoice_number: str | None = None
    invoice_date: str | None = None
    due_date: str | None = None
    amount: str | None = None
    currency: str | None = None
    missing_fields: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def extract_invoice_fields(text: str) -> InvoiceFields:
    """Deterministic field extraction used by both the tool and the verifier."""
    first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
    doc_type = "invoice" if first_line.upper() == "INVOICE" else first_line.lower() or "unknown"

    fields = InvoiceFields(document_type=doc_type)
    fields.vendor = _field(text, "Vendor")
    fields.invoice_number = _field(text, "Invoice Number")
    fields.invoice_date = (d := _parse_date(_field(text, "Invoice Date"))) and d.isoformat()
    fields.due_date = (d := _parse_date(_field(text, "Due Date"))) and d.isoformat()

    total = re.search(r"^\s*Total Due\s*:\s*([A-Z]{3})\s*([\d,]+(?:\.\d{1,2})?)\s*$", text, re.I | re.M)
    if total:
        fields.currency = total.group(1).upper()
        try:
            fields.amount = str(Decimal(total.group(2).replace(",", "")).quantize(Decimal("0.01")))
        except InvalidOperation:
            fields.warnings.append("Total amount could not be parsed.")

    if doc_type != "invoice":
        fields.warnings.append(f"Document is a '{doc_type}', not an invoice.")

    for name in ("vendor", "invoice_number", "due_date", "amount", "currency"):
        if not getattr(fields, name):
            fields.missing_fields.append(name)

    if fields.invoice_date and fields.due_date and fields.due_date < fields.invoice_date:
        fields.warnings.append("Due date is earlier than the invoice date.")

    return fields


def search_documents(query: str) -> list[dict]:
    """Case-insensitive keyword search over the approved folder, newest first."""
    terms = [t for t in re.split(r"\W+", query.lower()) if len(t) > 1]
    results = []
    for path in sorted(_root().iterdir()):
        if path.suffix.lower() not in SUPPORTED_SUFFIXES or not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        haystack = f"{path.name}\n{text}".lower()
        matched = [t for t in terms if t in haystack]
        if terms and not matched:
            continue
        info = extract_invoice_fields(text)
        results.append(
            {
                "path": path.name,
                "document_type": info.document_type,
                "vendor": info.vendor,
                "reference": info.invoice_number or _field(text, "Quote Number"),
                "document_date": info.invoice_date or _field(text, "Quote Date"),
                "matched_terms": matched,
                "score": len(matched),
            }
        )
    results.sort(key=lambda r: (r["score"], r["document_date"] or ""), reverse=True)
    return results
