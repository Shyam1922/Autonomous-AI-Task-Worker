import { Bell, Search, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/history": "Task History",
  "/settings": "Settings",
};

export default function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "TaskPilot";

  return (
    <header className="flex h-[76px] items-center justify-between border-b border-white/10 px-6 md:px-8">
      <div>
        <p className="mb-1 text-xs text-zinc-500">Workspace / {title}</p>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-500 md:flex">
          <Search size={15} />
          <span>Search tasks...</span>
          <kbd className="ml-5 rounded border border-white/10 px-1.5 py-0.5 text-xs">
            /
          </kbd>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="rounded-xl border border-white/10 p-2.5 text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          <Bell size={18} />
        </button>

        <div className="hidden items-center gap-2 rounded-xl bg-violet-500/10 px-3 py-2 text-sm text-violet-300 sm:flex">
          <Sparkles size={16} />
          <span>AI workspace</span>
        </div>
      </div>
    </header>
  );
}