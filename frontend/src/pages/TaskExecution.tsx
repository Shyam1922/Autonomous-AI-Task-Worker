import { ArrowLeft, Loader2, RotateCcw, Square } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import EvidencePanel from "../components/evidence/EvidencePanel";
import VerificationStatus from "../components/evidence/VerificationStatus";
import AgentActivity from "../components/execution/AgentActivity";
import ApprovalDialog from "../components/execution/ApprovalDialog";
import ExecutionTimeline from "../components/execution/ExecutionTimeline";
import TaskStatus from "../components/task/TaskStatus";
import { api, ApiError } from "../services/api";
import { useTask } from "../store/taskStore";
import { isTerminal } from "../types/task";

export default function TaskExecution() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { task, events, loading, error, live, applyTask } = useTask(taskId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-zinc-400">
        <Loader2 size={18} className="animate-spin" /> Loading task...
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Task not available</h1>
        <p className="mt-2 text-zinc-500">{error ?? "This task does not exist."}</p>
        <Link to="/" className="mt-4 inline-block text-violet-400">
          Return to dashboard
        </Link>
      </div>
    );
  }

  const current = task;
  const terminal = isTerminal(current.status);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const request = current.pending_request;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft size={16} />
        Dashboard
      </Link>

      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <TaskStatus status={current.status} />
          <span className="text-xs text-zinc-500">
            {current.step_count} step{current.step_count === 1 ? "" : "s"} · agent: {current.llm_provider}
          </span>
        </div>

        <p className="break-words text-base leading-7 text-zinc-100">{current.goal}</p>

        {current.summary && (
          <p
            className={`mt-4 rounded-xl p-3 text-sm ${
              current.status === "completed"
                ? "bg-emerald-500/[0.07] text-emerald-200"
                : terminal
                  ? "bg-amber-500/[0.07] text-amber-200"
                  : "bg-white/[0.04] text-zinc-300"
            }`}
          >
            {current.summary}
          </p>
        )}

        {actionError && <p className="mt-3 text-sm text-red-400">{actionError}</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          {!terminal && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(async () => applyTask(await api.cancelTask(current.id)))}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-40"
            >
              <Square size={14} />
              Cancel
            </button>
          )}
          {terminal && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const next = await api.retryTask(current.id);
                  navigate(`/tasks/${next.id}`);
                })
              }
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500 disabled:opacity-40"
            >
              <RotateCcw size={16} />
              Run again
            </button>
          )}
        </div>
      </div>

      {request && (
        <ApprovalDialog
          key={request.id}
          request={request}
          onApprove={async (comment) => applyTask(await api.decideApproval(current.id, request.id, "approve", comment))}
          onReject={async (comment) => applyTask(await api.decideApproval(current.id, request.id, "reject", comment))}
          onAnswer={async (answer) => applyTask(await api.answerInput(current.id, request.id, answer))}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <AgentActivity events={events} live={live} />
        </div>
        <div className="space-y-6">
          <ExecutionTimeline task={current} />
          <EvidencePanel report={current.result} />
          <VerificationStatus verification={current.verification} status={current.status} />
        </div>
      </div>
    </div>
  );
}
