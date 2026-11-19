import {
  Brain,
  CheckCircle2,
  CircleAlert,
  Flag,
  Hand,
  ListChecks,
  MessageCircleQuestion,
  ShieldCheck,
  ShieldX,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import type { TaskEvent } from "../../types/execution";

const icons: Record<string, { icon: LucideIcon; color: string }> = {
  agent_thought: { icon: Brain, color: "text-violet-300" },
  plan_updated: { icon: ListChecks, color: "text-violet-300" },
  tool_called: { icon: Wrench, color: "text-zinc-400" },
  tool_result: { icon: CheckCircle2, color: "text-emerald-400" },
  tool_failed: { icon: CircleAlert, color: "text-red-400" },
  policy_denied: { icon: ShieldX, color: "text-red-400" },
  approval_requested: { icon: Hand, color: "text-amber-300" },
  approval_granted: { icon: ShieldCheck, color: "text-emerald-400" },
  approval_rejected: { icon: ShieldX, color: "text-orange-300" },
  input_requested: { icon: MessageCircleQuestion, color: "text-amber-300" },
  user_input: { icon: MessageCircleQuestion, color: "text-emerald-400" },
  verification_finished: { icon: ShieldCheck, color: "text-violet-300" },
  task_finished: { icon: Flag, color: "text-zinc-300" },
};

const HIDDEN = new Set(["task_created", "task_started", "verification_started"]);

function Detail({ event }: { event: TaskEvent }) {
  const [open, setOpen] = useState(false);
  const payload = event.data.output ?? event.data.input;
  if (!payload) return null;
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen(!open)} className="text-xs text-zinc-500 hover:text-zinc-300">
        {open ? "Hide details" : "Show details"}
      </button>
      {open && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] leading-5 text-zinc-400">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AgentActivity({ events, live }: { events: TaskEvent[]; live: boolean }) {
  const visible = events.filter((e) => !HIDDEN.has(e.type));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Agent activity</h2>
        {live && (
          <span className="flex items-center gap-2 text-xs text-violet-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" /> Live
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-500">Waiting for the agent to start...</p>
      ) : (
        <ol className="space-y-3">
          {visible.map((event) => {
            const { icon: Icon, color } = icons[event.type] ?? { icon: Wrench, color: "text-zinc-400" };
            return (
              <li key={event.id} className="flex gap-3">
                <Icon size={16} className={`mt-0.5 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  <p className={`break-words text-sm ${event.type === "agent_thought" ? "text-zinc-200" : "text-zinc-400"}`}>
                    {event.message}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">{new Date(event.created_at).toLocaleTimeString()}</p>
                  {(event.type === "tool_result" || event.type === "tool_called") && <Detail event={event} />}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
