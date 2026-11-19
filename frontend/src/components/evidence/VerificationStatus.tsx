import { CheckCircle2, CircleHelp, ShieldCheck, XCircle } from "lucide-react";

import type { Verification } from "../../types/execution";
import { isTerminal, type TaskStatus } from "../../types/task";

const HEADLINE = {
  passed: { text: "Verified independently", className: "text-emerald-400" },
  failed: { text: "Verification failed", className: "text-red-400" },
  inconclusive: { text: "Could not be verified", className: "text-amber-300" },
};

export default function VerificationStatus({
  verification,
  status,
}: {
  verification: Verification | null;
  status: TaskStatus;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck size={19} className="text-violet-300" />
        <h2 className="font-semibold">Verification</h2>
      </div>

      {!verification ? (
        <p className="text-sm text-zinc-500">
          {isTerminal(status)
            ? "This task ended before reporting a result to verify."
            : "Runs when the agent reports its result. The system re-reads the source and the destination instead of trusting the agent."}
        </p>
      ) : (
        <>
          <p className={`text-sm font-medium ${HEADLINE[verification.status].className}`}>
            {HEADLINE[verification.status].text}
          </p>
          {verification.checks.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">The agent reported no evidence that could be checked.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {verification.checks.map((check, i) => (
                <li key={i} className="flex gap-2 text-xs" title={check.detail}>
                  {check.passed ? (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
                  )}
                  <span className={check.passed ? "text-zinc-400" : "text-red-300"}>
                    {check.name}
                    {!check.passed && <span className="block text-zinc-500">{check.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {verification?.status === "inconclusive" && (
        <p className="mt-3 flex items-center gap-1 text-xs text-zinc-500">
          <CircleHelp size={13} /> Without evidence, the task is not marked completed.
        </p>
      )}
    </div>
  );
}
