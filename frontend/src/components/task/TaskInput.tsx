import { ArrowRight, Loader2, Plus } from "lucide-react";
import type { FormEvent } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (goal: string) => void;
  submitting: boolean;
  error: string | null;
  providerNote?: string;
}

export default function TaskInput({ value, onChange, onSubmit, submitting, error, providerNote }: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const goal = value.trim();
    if (goal && !submitting) onSubmit(goal);
  }

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.09] to-transparent p-1">
      <form onSubmit={handleSubmit} className="rounded-xl bg-[#111115] p-5 md:p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
          <Plus size={18} className="text-violet-400" />
          Create a new task
        </div>

        <label htmlFor="task-goal" className="sr-only">
          Describe what you want TaskPilot to do
        </label>
        <textarea
          id="task-goal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Example: Find the newest invoice from Acme Supplies, extract the amount and due date, enter it into the finance system and verify it."
          rows={4}
          className="w-full resize-y rounded-xl border border-white/10 bg-[#0b0b0e] p-4 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10"
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-600">{providerNote}</p>
          <button
            type="submit"
            disabled={!value.trim() || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Start task
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}
