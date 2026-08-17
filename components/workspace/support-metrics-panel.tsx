import { Clock3, Repeat2, Timer } from "lucide-react";

import type { SupportMetrics } from "@/lib/support-metrics";

function formatHours(hours: number | null) {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} דקות`;
  if (hours < 48) return `${Math.round(hours * 10) / 10} שעות`;
  return `${Math.round(hours / 24 * 10) / 10} ימים`;
}

// Server-rendered, no client interactivity needed for a static dashboard.
// Track P1-08's "support dashboard" ask: first-response time, resolution
// time, reopen rate -- see lib/support-metrics.ts for the exact
// aggregation logic and its documented imprecision.
export function SupportMetricsPanel({ metrics }: { metrics: SupportMetrics }) {
  return (
    <section className="template-list-card support-metrics-panel" aria-labelledby="support-metrics-title">
      <div className="template-list-heading">
        <div>
          <p className="eyebrow">מדדי תמיכה</p>
          <h2 id="support-metrics-title">קצב הטיפול בפניות</h2>
        </div>
      </div>
      <div className="support-metrics-grid">
        <article className="support-metric-card">
          <Timer size={18} />
          <strong>{formatHours(metrics.avgFirstResponseHours)}</strong>
          <small>זמן ממוצע לתגובה ראשונה ({metrics.respondedCount} מתוך {metrics.totalTickets})</small>
        </article>
        <article className="support-metric-card">
          <Clock3 size={18} />
          <strong>{formatHours(metrics.avgResolutionHours)}</strong>
          <small>זמן ממוצע לפתרון ({metrics.resolvedCount} מתוך {metrics.totalTickets})</small>
        </article>
        <article className="support-metric-card">
          <Repeat2 size={18} />
          <strong>{metrics.reopenRatePercent === null ? "—" : `${Math.round(metrics.reopenRatePercent)}%`}</strong>
          <small>שיעור פתיחה מחדש ({metrics.reopenedCount} מתוך {metrics.totalTickets})</small>
        </article>
      </div>
    </section>
  );
}
