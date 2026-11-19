import type { TaskStatus as Status } from "../../types/task";

const styles: Record<Status, { label: string; className: string; dot: string }> = {
  queued: { label: "Queued", className: "bg-zinc-500/10 text-zinc-300", dot: "bg-zinc-400" },
  running: { label: "Running", className: "bg-violet-500/10 text-violet-300", dot: "bg-violet-400 animate-pulse" },
  waiting_approval: { label: "Needs approval", className: "bg-amber-500/10 text-amber-300", dot: "bg-amber-400 animate-pulse" },
  waiting_input: { label: "Needs input", className: "bg-amber-500/10 text-amber-300", dot: "bg-amber-400 animate-pulse" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-300", dot: "bg-emerald-400" },
  partial: { label: "Not verified", className: "bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  blocked: { label: "Blocked", className: "bg-orange-500/10 text-orange-300", dot: "bg-orange-400" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-300", dot: "bg-red-400" },
  cancelled: { label: "Cancelled", className: "bg-zinc-500/10 text-zinc-400", dot: "bg-zinc-500" },
};

export default function TaskStatus({ status }: { status: Status }) {
  const style = styles[status] ?? styles.queued;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
