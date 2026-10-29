import { Clock3, History, Search } from "lucide-react";

export default function TaskHistory() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Task history</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Review previous tasks, execution steps, and verified results.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-20 text-center">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-violet-300">
          <History size={26} />
        </div>

        <h2 className="text-lg font-medium">Your task history will appear here</h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
          Once we connect the backend, you will be able to review completed,
          failed, and cancelled tasks.
        </p>

        <div className="mt-6 flex items-center gap-2 text-xs text-zinc-600">
          <Search size={14} />
          Search and filtering will be added later.
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
          <Clock3 size={14} />
          No task records yet
        </div>
      </div>
    </div>
  );
}