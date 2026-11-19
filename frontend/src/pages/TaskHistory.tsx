import { Clock3, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import TaskCard from "../components/task/TaskCard";
import { api, ApiError } from "../services/api";
import type { TaskStatus, TaskSummary } from "../types/task";

const FILTERS: { label: string; statuses: TaskStatus[] | null }[] = [
  { label: "All", statuses: null },
  { label: "Active", statuses: ["queued", "running", "waiting_approval", "waiting_input"] },
  { label: "Completed", statuses: ["completed"] },
  { label: "Needs attention", statuses: ["partial", "blocked", "failed"] },
];

export default function TaskHistory() {
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState(0);

  useEffect(() => {
    api
      .listTasks(200)
      .then(setTasks)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load tasks"));
  }, []);

  const statuses = FILTERS[filter].statuses;
  const visible = (tasks ?? []).filter((t) => !statuses || statuses.includes(t.status));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Task history</h1>
        <p className="mt-2 text-sm text-zinc-500">Every task keeps its full plan, activity trail and verification evidence.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setFilter(i)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              i === filter ? "bg-violet-500/15 text-violet-300" : "text-zinc-400 hover:bg-white/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : tasks === null ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 size={16} className="animate-spin" /> Loading...
        </p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <Clock3 size={28} className="mx-auto text-zinc-500" />
          <p className="mt-4 text-zinc-400">No tasks here yet.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-violet-400">
            Create a task
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
