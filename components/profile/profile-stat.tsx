import type { LucideIcon } from "lucide-react";

export function ProfileStat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-border bg-bg-elevated px-4 py-3 sm:flex-none sm:min-w-[6.5rem]">
      <Icon className="size-5 text-primary" />
      <span className="text-lg font-bold text-text-primary">{value}</span>
      <span className="text-center text-xs text-text-muted">{label}</span>
    </div>
  );
}
