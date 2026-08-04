import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <section className="card metric">
      <div>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value}</div>
        {hint ? <div className="metric-label">{hint}</div> : null}
      </div>
      <span className="brand-mark">
        <Icon size={20} />
      </span>
    </section>
  );
}
