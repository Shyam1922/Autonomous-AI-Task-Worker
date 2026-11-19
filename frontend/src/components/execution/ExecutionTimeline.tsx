import { ListChecks } from "lucide-react";

import type { Task } from "../../types/task";
import ExecutionStep, { type StepState } from "./ExecutionStep";

export default function ExecutionTimeline({ task }: { task: Task }) {
  const plan = task.plan ?? [];
  const finished = task.status === "completed";
  const working = task.status === "running" || task.status === "queued";
  const firstOpen = plan.findIndex((s) => s.status !== "completed");

  const stateFor = (index: number): StepState => {
    if (finished || plan[index].status === "completed") return "done";
    if (working && index === firstOpen) return "active";
    return "pending";
  };

  const done = plan.filter((_, i) => stateFor(i) === "done").length;
  const progress = plan.length ? Math.round((done / plan.length) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <ListChecks size={18} className="text-violet-300" />
          Plan
        </h2>
        <span className="text-sm text-violet-300">
          {plan.length ? `${done}/${plan.length}` : ""}
        </span>
      </div>

      {plan.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {working ? "The agent is drafting a plan..." : "No plan was recorded."}
        </p>
      ) : (
        <>
          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <ol className="space-y-5">
            {plan.map((step, i) => (
              <ExecutionStep key={`${i}-${step.title}`} step={step} index={i} state={stateFor(i)} />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
