import { CheckCircle2, Circle, Loader2 } from "lucide-react";

import type { PlanStep } from "../../types/task";

export type StepState = "done" | "active" | "pending";

export default function ExecutionStep({ step, index, state }: { step: PlanStep; index: number; state: StepState }) {
  return (
    <li className="flex gap-4">
      <div className="mt-0.5 shrink-0">
        {state === "done" ? (
          <CheckCircle2 size={20} className="text-emerald-400" />
        ) : state === "active" ? (
          <Loader2 size={20} className="animate-spin text-violet-400" />
        ) : (
          <Circle size={20} className="text-zinc-600" />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-medium ${state === "pending" ? "text-zinc-400" : "text-zinc-100"}`}>
          {index + 1}. {step.title}
        </p>
        <p className="mt-1 text-xs text-zinc-500">{step.success_criteria}</p>
      </div>
    </li>
  );
}
