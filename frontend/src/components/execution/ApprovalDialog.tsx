import { Hand, Loader2, MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import type { UserRequest } from "../../types/execution";

interface Props {
  request: UserRequest;
  onApprove: (comment?: string) => Promise<void>;
  onReject: (comment?: string) => Promise<void>;
  onAnswer: (answer: string) => Promise<void>;
}

const LABELS: Record<string, string> = {
  create_finance_record: "Create a record in the finance application",
};

export default function ApprovalDialog({ request, onApprove, onReject, onAnswer }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const isApproval = request.kind === "approval";
  const Icon = isApproval ? Hand : MessageCircleQuestion;

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.05] p-6" role="alertdialog" aria-labelledby="request-title">
      <div className="mb-3 flex items-center gap-2 text-amber-200">
        <Icon size={19} />
        <h2 id="request-title" className="font-semibold">
          {isApproval ? "Approval needed" : "The agent has a question"}
        </h2>
      </div>

      {isApproval ? (
        <>
          <p className="text-sm text-zinc-300">{LABELS[request.tool_name] ?? request.prompt}</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl bg-black/30 p-4 text-sm">
            {Object.entries(request.tool_input).map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-zinc-500">{key.replace(/_/g, " ")}</dt>
                <dd className="break-all font-mono text-zinc-200">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-sm text-zinc-200">{request.prompt}</p>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={isApproval ? "Optional comment for the agent" : "Your answer"}
        className="mt-4 w-full rounded-xl border border-white/10 bg-[#0b0b0e] p-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-amber-400/50"
      />

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        {isApproval ? (
          <>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => act("approve", () => onApprove(text))}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy === "approve" && <Loader2 size={15} className="animate-spin" />}
              Approve
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => act("reject", () => onReject(text))}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
            >
              {busy === "reject" && <Loader2 size={15} className="animate-spin" />}
              Reject
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy !== null || !text.trim()}
            onClick={() => act("answer", () => onAnswer(text.trim()))}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            {busy === "answer" && <Loader2 size={15} className="animate-spin" />}
            Send answer
          </button>
        )}
      </div>
    </div>
  );
}
