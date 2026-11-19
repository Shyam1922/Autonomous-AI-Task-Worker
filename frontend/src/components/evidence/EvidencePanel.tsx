import { Database, FileText, TriangleAlert } from "lucide-react";

import type { TaskReport } from "../../types/task";

const FIELD_ORDER = ["vendor", "invoice_number", "amount", "currency", "due_date"];

export default function EvidencePanel({ report }: { report: TaskReport | null }) {
  if (!report) return null;

  const entries = Object.entries(report.data ?? {}).sort(
    ([a], [b]) => (FIELD_ORDER.indexOf(a) + 1 || 99) - (FIELD_ORDER.indexOf(b) + 1 || 99),
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <h2 className="mb-4 font-semibold">Result</h2>

      {entries.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {entries.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-zinc-500">{key.replace(/_/g, " ")}</dt>
              <dd className="break-all font-mono text-zinc-200">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {report.evidence?.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-600">Evidence</p>
          <ul className="space-y-2">
            {report.evidence.map((item, i) => {
              const Icon = item.type === "destination_record" ? Database : FileText;
              return (
                <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                  <Icon size={15} className="text-violet-300" />
                  <span className="text-zinc-500">
                    {item.type === "destination_record" ? "Finance record" : "Source document"}
                  </span>
                  <span className="font-mono">{item.reference}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {report.unresolved_issues?.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3">
          {report.unresolved_issues.map((issue, i) => (
            <p key={i} className="flex gap-2 text-sm text-amber-200">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" /> {issue}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
