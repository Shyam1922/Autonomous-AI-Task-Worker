import { Bot, Database, FileText, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { api, ApiError } from "../services/api";
import type { DemoDocument, FinanceRecord, RuntimeConfig } from "../types/execution";

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">{icon}</div>
        <h2 className="font-medium">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-zinc-500">{k}</dt>
          <dd className="text-zinc-200">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Settings() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [docs, setDocs] = useState<DemoDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    Promise.all([api.config(), api.financeRecords(), api.documents()])
      .then(([c, r, d]) => {
        setConfig(c);
        setRecords(r);
        setDocs(d);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load settings"));

  useEffect(() => {
    load();
  }, []);

  async function reset() {
    if (!window.confirm("Delete all records from the simulated finance app?")) return;
    try {
      await api.resetFinanceRecords();
      setRecords([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Runtime configuration is read from <code className="text-zinc-300">backend/.env</code>. Restart the backend after changing it.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {config && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card icon={<Bot size={18} />} title="Agent">
            <Rows
              rows={[
                ["Provider", config.llm_provider === "claude" ? "Claude API" : "Offline mock planner"],
                ["Model", config.llm_model],
                ["Effort", config.llm_effort],
              ]}
            />
          </Card>
          <Card icon={<ShieldCheck size={18} />} title="Safety and approvals">
            <Rows
              rows={[
                ["Writes need approval", config.require_approval_for_writes ? "Yes" : "No"],
                ["Tools", "Allowlisted, typed"],
                ["Documents", "Approved folder only"],
              ]}
            />
          </Card>
          <Card icon={<SlidersHorizontal size={18} />} title="Execution limits">
            <Rows
              rows={[
                ["Max steps per task", config.max_steps_per_task],
                ["Retries per tool", config.max_retries_per_step],
                ["Tool timeout", `${config.tool_timeout_seconds}s`],
              ]}
            />
          </Card>
        </div>
      )}

      <Card icon={<Database size={18} />} title="Simulated finance app">
        {records.length === 0 ? (
          <p className="text-sm text-zinc-500">No records yet. Run an invoice task to create one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-zinc-600">
                <tr>
                  {["Record", "Vendor", "Invoice", "Amount", "Due", "Source"].map((h) => (
                    <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {records.map((r) => (
                  <tr key={r.record_id} className="border-t border-white/5">
                    <td className="py-2 pr-4 font-mono">{r.record_id}</td>
                    <td className="py-2 pr-4">{r.vendor}</td>
                    <td className="py-2 pr-4 font-mono">{r.invoice_number}</td>
                    <td className="py-2 pr-4">{r.currency} {r.amount}</td>
                    <td className="py-2 pr-4">{r.due_date}</td>
                    <td className="py-2 pr-4 text-zinc-500">{r.source_document}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {config?.app_env === "development" && records.length > 0 && (
          <button type="button" onClick={reset} className="mt-4 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-red-300">
            <Trash2 size={14} /> Reset demo records
          </button>
        )}
      </Card>

      <Card icon={<FileText size={18} />} title="Approved document source (synthetic)">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {docs.map((d) => (
            <li key={d.path} className="flex justify-between gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
              <span className="truncate text-zinc-300">{d.path}</span>
              <span className="shrink-0 text-xs text-zinc-500">{d.document_type} · {d.document_date ?? "no date"}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
