import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileSearch,
  Paperclip,
  Play,
  Plus,
  Sparkles,
  Workflow,
} from "lucide-react";

const stats = [
  {
    label: "Total tasks",
    value: "0",
    note: "Tasks created in this session",
    icon: Workflow,
  },
  {
    label: "Running",
    value: "0",
    note: "Currently executing",
    icon: Play,
  },
  {
    label: "Completed",
    value: "0",
    note: "Successfully verified",
    icon: CheckCircle2,
  },
  {
    label: "Needs attention",
    value: "0",
    note: "Waiting for your input",
    icon: CircleAlert,
  },
];

const examples = [
  {
    title: "Find an invoice",
    description: "Locate an invoice and extract its key details.",
    icon: FileSearch,
    prompt:
      "Find the latest invoice from a company and extract the amount and due date.",
  },
  {
    title: "Organize documents",
    description: "Review files and organize them by category.",
    icon: Workflow,
    prompt:
      "Review my documents and suggest how to organize them into categories.",
  },
  {
    title: "Prepare a report",
    description: "Collect information and prepare a summary.",
    icon: Clock3,
    prompt:
      "Collect the key information from my project documents and prepare a summary.",
  },
];

export default function Dashboard() {
  const [taskDescription, setTaskDescription] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskDescription.trim()) {
      return;
    }

    // Phase 1: The backend is not connected yet.
    // In a later phase, this will create a real agent task.
    alert(
      `Your task description:\n\n${taskDescription}\n\nThe agent backend will be connected in a later phase.`,
    );
  }

  function useExample(prompt: string) {
    setTaskDescription(prompt);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      {/* Welcome section */}
      <section>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
          <Sparkles size={14} />
          Your autonomous workspace
        </div>

        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Get things done with{" "}
          <span className="text-violet-400">TaskPilot.</span>
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
          Describe the outcome you want. Your AI worker will eventually plan
          the steps, execute actions, recover from errors, and verify the
          result.
        </p>
      </section>

      {/* Task composer */}
      <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.09] to-transparent p-1">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl bg-[#111115] p-5 md:p-6"
        >
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-200">
            <Plus size={18} className="text-violet-400" />
            Create a new task
          </div>

          <label htmlFor="task-description" className="sr-only">
            Describe what you want TaskPilot to do
          </label>

          <textarea
            id="task-description"
            value={taskDescription}
            onChange={(event) => setTaskDescription(event.target.value)}
            placeholder="Example: Find the latest invoice from Acme, extract the amount and due date, and prepare the details for review..."
            rows={4}
            className="w-full resize-y rounded-xl border border-white/10 bg-[#0b0b0e] p-4 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10"
          />

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() =>
                alert("File attachments will be added in a later phase.")
              }
              className="flex w-fit items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
            >
              <Paperclip size={16} />
              Attach files (coming soon)
            </button>

            <button
              type="submit"
              disabled={!taskDescription.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create task
              <ArrowRight size={16} />
            </button>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            Demo mode · Tasks are not executed or sent to a backend yet.
          </p>
        </form>
      </section>

      {/* Statistics */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Workspace overview</h2>
          <p className="mt-1 text-sm text-zinc-500">
            A snapshot of your task activity.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition hover:border-white/20"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{stat.label}</span>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-violet-300">
                    <Icon size={17} />
                  </div>
                </div>

                <p className="text-3xl font-semibold">{stat.value}</p>
                <p className="mt-2 text-xs text-zinc-600">{stat.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Example tasks */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Try an example</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Start with an example and customize it for your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {examples.map((example) => {
            const Icon = example.icon;

            return (
              <button
                key={example.title}
                type="button"
                onClick={() => useExample(example.prompt)}
                className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-violet-400/40 hover:bg-violet-500/[0.04]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="rounded-xl bg-violet-500/10 p-3 text-violet-300">
                    <Icon size={20} />
                  </div>

                  <ArrowUpRight
                    size={17}
                    className="text-zinc-600 transition group-hover:text-violet-300"
                  />
                </div>

                <h3 className="font-medium">{example.title}</h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {example.description}
                </p>

                <p className="mt-4 text-xs font-medium text-violet-300">
                  Use this example →
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Upcoming capability */}
      <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-xs font-medium uppercase tracking-wider text-amber-300">
              Next milestone
            </span>
          </div>

          <h3 className="font-medium">Watch your agent work</h3>

          <p className="mt-1 text-sm leading-6 text-zinc-500">
            We will add live execution steps, error recovery, approval requests,
            and evidence-backed verification.
          </p>
        </div>

        <span className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400">
          Coming in Phase 2
        </span>
      </section>
    </div>
  );
}