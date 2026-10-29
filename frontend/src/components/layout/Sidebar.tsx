import {
  Activity,
  Bot,
  Clock3,
  LayoutDashboard,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Task History", path: "/history", icon: Clock3 },
  { name: "Settings", path: "/settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#0c0c10] px-4 py-6">
      {/* Brand */}
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-900/30">
          <Bot size={23} />
        </div>

        <div>
          <h1 className="text-lg font-semibold tracking-tight">TaskPilot</h1>
          <p className="text-xs text-zinc-500">Autonomous AI Worker</p>
        </div>
      </div>

      {/* Navigation */}
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600">
        Workspace
      </p>

      <nav className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  isActive
                    ? "bg-violet-500/15 font-medium text-violet-300"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom status card */}
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShieldCheck size={17} />
          </div>
          <span className="text-sm font-medium">System status</span>
        </div>

        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Development mode
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Activity size={14} />
          Backend not connected
        </div>
      </div>

      <p className="mt-5 px-2 text-xs text-zinc-600">
        TaskPilot · Early access
      </p>
    </aside>
  );
}