import { ArrowUpRight, CheckCircle2, CircleAlert, FileSearch, Play, Sparkles, Workflow, Copy, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import TaskCard from "../components/task/TaskCard";
import TaskInput from "../components/task/TaskInput";
import { api, ApiError } from "../services/api";
import type { RuntimeConfig } from "../types/execution";
import type { TaskStats, TaskSummary } from "../types/task";

const examples = [
  {
    title: "Enter the newest invoice",
    description: "Find, extract, create a finance record (with your approval), then verify it.",
    icon: FileSearch,
    prompt:
      "Find the newest invoice from Acme Supplies in the demo documents. Extract the invoice number, amount, currency and due date, create a corresponding record in the finance application, and verify that the saved record matches the invoice.",
  },
  {
    title: "Extract details only",
    description: "Read-only: extract key fields and verify them against the source document.",
    icon: Copy,
    prompt: "Find the latest invoice from Globex Corporation and extract the invoice number, amount and due date.",
  },
  {
    title: "Handle missing data",
    description: "The Initech invoice has no due date. The agent should stop instead of guessing.",
    icon: ShieldAlert,
    prompt: "Find the latest invoice from Initech and enter it into the finance system.",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [recent, setRecent] = useState<TaskSummary[]>([]);
  const [config, setConfig] = useState<RuntimeConfig | null>(null);

  useEffect(() => {
    Promise.all([api.stats(), api.listTasks(5), api.config()])
      .then(([s, r, c]) => {
        setStats(s);
        setRecent(r);
        setConfig(c);
      })
      .catch(() => setError("Cannot reach the TaskPilot backend. Start it with uvicorn and refresh."));
  }, []);

  async function startTask(text: string) {
    setSubmitting(true);
    setError(null);
    try {
      const task = await api.createTask(text);
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the task");
      setSubmitting(false);
    }
  }

  const cards = [
    { label: "Total tasks", value: stats?.total, note: "All tasks in this workspace", icon: Workflow },
    { label: "Running", value: stats?.running, note: "Currently executing", icon: Play },
    { label: "Completed", value: stats?.completed, note: "Independently verified", icon: CheckCircle2 },
    { label: "Needs attention", value: stats?.needs_attention, note: "Approvals, blocked or unverified", icon: CircleAlert },
  ];

  const providerNote = config
    ? config.llm_provider === "claude"
      ? `Agent: Claude (${config.llm_model}) · writes ${config.require_approval_for_writes ? "need your approval" : "run without approval"}`
      : "Agent: offline mock planner (set ANTHROPIC_API_KEY to use Claude) · demo invoice tasks only"
    : "";

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <section>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
          <Sparkles size={14} />
          Act · Observe · Reason · Recover · Verify
        </div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Get things done with <span className="text-violet-400">TaskPilot.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
          Describe the outcome you want. The agent plans the steps, uses approved tools, asks before
          writing anything, and verifies the result against the source instead of trusting itself.
        </p>
      </section>

      <TaskInput
        value={goal}
        onChange={setGoal}
        onSubmit={startTask}
        submitting={submitting}
        error={error}
        providerNote={providerNote}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-sm text-zinc-400">{label}</span>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-violet-300">
                <Icon size={17} />
              </div>
            </div>
            <p className="text-3xl font-semibold">{value ?? "–"}</p>
            <p className="mt-2 text-xs text-zinc-600">{note}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Try an example</h2>
          <p className="mt-1 text-sm text-zinc-500">These run against synthetic invoices and a simulated finance app.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {examples.map(({ title, description, icon: Icon, prompt }) => (
            <button
              key={title}
              type="button"
              onClick={() => {
                setGoal(prompt);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-violet-400/40 hover:bg-violet-500/[0.04]"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-violet-500/10 p-3 text-violet-300">
                  <Icon size={20} />
                </div>
                <ArrowUpRight size={17} className="text-zinc-600 transition group-hover:text-violet-300" />
              </div>
              <h3 className="font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
            </button>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent tasks</h2>
            <Link to="/history" className="text-sm text-violet-400 hover:text-violet-300">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recent.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
