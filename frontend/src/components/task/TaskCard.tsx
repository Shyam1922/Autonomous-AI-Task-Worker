import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import type { TaskSummary } from "../../types/task";
import TaskStatus from "./TaskStatus";

export default function TaskCard({ task }: { task: TaskSummary }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-4 transition hover:border-violet-500/30"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.goal}</p>
        {task.summary && <p className="mt-1 truncate text-xs text-zinc-500">{task.summary}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <TaskStatus status={task.status} />
          <span className="text-xs text-zinc-600">{new Date(task.created_at).toLocaleString()}</span>
          <span className="text-xs text-zinc-600">
            {task.step_count} step{task.step_count === 1 ? "" : "s"} · {task.llm_provider}
          </span>
        </div>
      </div>
      <ArrowUpRight size={18} className="shrink-0 text-zinc-500" />
    </Link>
  );
}
