import { Activity, AlertTriangle, ChartNoAxesCombined } from "lucide-react";

import type { Tables } from "@/types/database";

type OperationalEvent = Tables<"operational_events">;

export function OperationalMetricsPanel({ events }: { events: OperationalEvent[] }) {
  const now = Date.now();
  const errors24h = events.filter((event) => event.event_type === "error" && now - new Date(event.created_at).getTime() <= 86_400_000);
  const productEvents7d = events.filter((event) => event.event_type === "product");
  const uniqueFingerprints = new Set(errors24h.map((event) => event.fingerprint).filter(Boolean)).size;

  return (
    <section className="template-list-card support-metrics-panel" aria-labelledby="operational-metrics-title">
      <div className="template-list-heading">
        <div>
          <p className="eyebrow">ניטור וחוסן</p>
          <h2 id="operational-metrics-title">בריאות המערכת ואירועי שימוש</h2>
        </div>
      </div>
      <div className="support-metrics-grid">
        <article className="support-metric-card">
          <AlertTriangle size={18} />
          <strong>{errors24h.length}</strong>
          <small>שגיאות לקוח ב־24 השעות האחרונות</small>
        </article>
        <article className="support-metric-card">
          <Activity size={18} />
          <strong>{uniqueFingerprints}</strong>
          <small>תקלות ייחודיות ב־24 השעות האחרונות</small>
        </article>
        <article className="support-metric-card">
          <ChartNoAxesCombined size={18} />
          <strong>{productEvents7d.length}</strong>
          <small>אירועי מוצר בשבעת הימים האחרונים</small>
        </article>
      </div>
    </section>
  );
}
