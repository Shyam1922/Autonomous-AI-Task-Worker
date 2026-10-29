import { Bot, ShieldCheck, SlidersHorizontal } from "lucide-react";

const settingsGroups = [
  {
    title: "Agent configuration",
    description:
      "Configure the AI model, execution limits, and task behavior.",
    icon: Bot,
    status: "Not configured",
  },
  {
    title: "Safety and approvals",
    description:
      "Define which actions require your approval before execution.",
    icon: ShieldCheck,
    status: "Coming soon",
  },
  {
    title: "Execution preferences",
    description:
      "Configure retries, timeouts, and task execution preferences.",
    icon: SlidersHorizontal,
    status: "Coming soon",
  },
];

export default function Settings() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Configure how your autonomous worker will operate.
        </p>
      </div>

      <div className="space-y-4">
        {settingsGroups.map((group) => {
          const Icon = group.icon;

          return (
            <div
              key={group.title}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:flex-row sm:items-center"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                <Icon size={21} />
              </div>

              <div className="flex-1">
                <h2 className="font-medium">{group.title}</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {group.description}
                </p>
              </div>

              <span className="w-fit shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-500">
                {group.status}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-5">
        <p className="text-sm font-medium text-amber-200">
          Configuration is not active yet
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          These are interface placeholders. We will connect them to actual
          backend configuration only after the agent architecture is in place.
        </p>
      </div>
    </div>
  );
}