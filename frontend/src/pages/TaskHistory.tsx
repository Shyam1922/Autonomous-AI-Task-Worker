
import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, ArrowUpRight } from "lucide-react";
import { getTasks, type Task } from "../services/mockTaskEngine";

export default function TaskHistory() {
  const [tasks] = useState<Task[]>(() => getTasks());

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Task history</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Previously created demo tasks
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-white/10 p-12 text-center">
          <Clock3 size={28} className="mx-auto text-zinc-500" />
          <p className="mt-4 text-zinc-400">
            No tasks created yet.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block text-sm text-violet-400"
          >
            Create your first task
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-violet-500/30"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {task.description}
                </p>

                <p className="mt-2 text-xs text-zinc-500">
                  {new Date(task.createdAt).toLocaleString()}
                </p>

                <span className="mt-2 inline-block text-xs capitalize text-violet-300">
                  {task.status}
                </span>
              </div>

              <ArrowUpRight
                size={18}
                className="shrink-0 text-zinc-500"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
