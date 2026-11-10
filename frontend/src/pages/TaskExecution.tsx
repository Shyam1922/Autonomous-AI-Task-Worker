
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import {
  executionSteps,
  getTask,
  updateTask,
  type Task,
} from "../services/mockTaskEngine";

export default function TaskExecution() {
  const { taskId } = useParams();
  const [task, setTask] = useState<Task | undefined>(() =>
    taskId ? getTask(taskId) : undefined
  );

  useEffect(() => {
    if (!taskId) return;

    setTask(getTask(taskId));
  }, [taskId]);

  useEffect(() => {
    if (!task || !taskId) return;

    if (task.status === "completed" || task.status === "failed") {
      return;
    }

    if (task.status === "paused") return;

    const timer = window.setTimeout(() => {
      const nextStep = task.currentStep + 1;
      const completed = nextStep >= executionSteps.length;

      const updated = updateTask(taskId, {
        currentStep: Math.min(nextStep, executionSteps.length),
        status: completed ? "completed" : "running",
      });

      setTask(updated);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [task, taskId]);

  function pauseOrResume() {
    if (!taskId || !task) return;

    const updated = updateTask(taskId, {
      status: task.status === "paused" ? "running" : "paused",
    });

    setTask(updated);
  }

  function restart() {
    if (!taskId) return;

    const updated = updateTask(taskId, {
      currentStep: 0,
      status: "queued",
    });

    setTask(updated);
  }

  if (!task) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Task not found</h1>
        <p className="mt-2 text-zinc-500">
          This task does not exist in your local demo data.
        </p>
        <Link to="/" className="mt-4 inline-block text-violet-400">
          Return to dashboard
        </Link>
      </div>
    );
  }

  const progress = Math.round(
    (task.currentStep / executionSteps.length) * 100
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        Dashboard
      </Link>

      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="rounded-lg bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
            DEMO TASK
          </span>

          <span className="text-sm capitalize text-zinc-400">
            {task.status}
          </span>
        </div>

        <h1 className="text-2xl font-semibold">
          Task execution
        </h1>

        <p className="mt-3 break-words text-sm leading-6 text-zinc-400">
          {task.description}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={pauseOrResume}
            disabled={
              task.status === "completed" ||
              task.status === "failed"
            }
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm disabled:opacity-40"
          >
            {task.status === "paused" ? (
              <Play size={16} />
            ) : (
              <Pause size={16} />
            )}
            {task.status === "paused" ? "Resume" : "Pause"}
          </button>

          <button
            onClick={restart}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500"
          >
            <RotateCcw size={16} />
            Restart demo
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Execution timeline</h2>
            <span className="text-sm text-violet-300">{progress}%</span>
          </div>

          <div className="mb-7 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="space-y-6">
            {executionSteps.map((step, index) => {
              const completed = index < task.currentStep;
              const active =
                index === task.currentStep &&
                task.status === "running";

              return (
                <div key={step} className="flex items-center gap-4">
                  {completed ? (
                    <CheckCircle2
                      size={21}
                      className="text-emerald-400"
                    />
                  ) : active ? (
                    <Loader2
                      size={21}
                      className="animate-spin text-violet-400"
                    />
                  ) : (
                    <Circle size={21} className="text-zinc-600" />
                  )}

                  <div>
                    <p className="text-sm font-medium">{step}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {completed
                        ? "Completed"
                        : active
                          ? "Processing..."
                          : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <h2 className="mb-4 font-semibold">Agent activity</h2>

            <div className="space-y-3">
              {executionSteps
                .slice(0, task.currentStep)
                .map((step, index) => (
                  <div
                    key={step}
                    className="border-l-2 border-violet-500/40 pl-3"
                  >
                    <p className="text-sm text-zinc-300">{step}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Step {index + 1} completed
                    </p>
                  </div>
                ))}

              {task.currentStep === 0 && (
                <p className="text-sm text-zinc-500">
                  Waiting for execution events...
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck size={19} className="text-violet-300" />
              <h2 className="font-semibold">Verification</h2>
            </div>

            {task.status === "completed" ? (
              <>
                <p className="text-sm text-emerald-400">
                  Demo workflow completed
                </p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  All simulated steps finished. No real files,
                  external systems, or task outcomes were verified.
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                Awaiting completion of the demo workflow.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
