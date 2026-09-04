"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, Scale } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Period = { id: string; department_id: string; year: number; month: number };
type Worker = { user_id: string; department_ids: string[]; profile: { first_name: string; last_name: string } | null };
type Submission = { id: string; schedule_period_id: string; user_id: string; submitted_at: string | null };
type Availability = { submission_id: string; shift_template_id: string; shift_date: string; status: string };
type Shift = { id: string; schedule_period_id: string; shift_template_id: string | null; shift_date: string; start_time: string; end_time: string; status: string };
type Assignment = { shift_id: string; user_id: string };
type WorkerMetric = {
  userId: string;
  name: string;
  assignedHours: number;
  eligibleOpportunities: number;
  preferredOpportunities: number;
  preferredAssigned: number;
  onlyIfNeededAssigned: number;
};
type Finding = { key: string; title: string; detail: string; severity: "warning" | "info" };

function shiftHours(shift: Shift) {
  const [startH, startM] = shift.start_time.split(":").map(Number);
  const [endH, endM] = shift.end_time.split(":").map(Number);
  let minutes = endH * 60 + endM - (startH * 60 + startM);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

export function FairnessEnhancer({ periods, workers, submissions, availability }: {
  periods: Period[];
  workers: Worker[];
  submissions: Submission[];
  availability: Availability[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [metrics, setMetrics] = useState<WorkerMetric[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [checking, setChecking] = useState(false);

  const workerName = useCallback((userId: string) => {
    const profile = workers.find((worker) => worker.user_id === userId)?.profile;
    return profile ? `${profile.first_name} ${profile.last_name}`.trim() : "עובד/ת";
  }, [workers]);

  const scan = useCallback(async (periodId: string) => {
    if (!periodId) return;
    setChecking(true);
    const period = periods.find((item) => item.id === periodId);
    if (!period) { setChecking(false); return; }

    const db = supabase as any;
    const { data: shiftRows } = await db
      .from("shifts")
      .select("id, schedule_period_id, shift_template_id, shift_date, start_time, end_time, status")
      .eq("schedule_period_id", periodId)
      .neq("status", "cancelled");
    const shifts = (shiftRows ?? []) as Shift[];
    const shiftIds = shifts.map((shift) => shift.id);
    const { data: assignmentRows } = shiftIds.length
      ? await db.from("shift_assignments").select("shift_id, user_id").in("shift_id", shiftIds)
      : { data: [] };
    const assignments = (assignmentRows ?? []) as Assignment[];
    const periodWorkers = workers.filter((worker) => worker.department_ids.includes(period.department_id));

    const nextMetrics = periodWorkers.map((worker): WorkerMetric => {
      const submission = submissions.find((item) => item.schedule_period_id === periodId && item.user_id === worker.user_id && item.submitted_at);
      const entries = submission ? availability.filter((item) => item.submission_id === submission.id) : [];
      const eligibleEntries = entries.filter((entry) => entry.status !== "unavailable");
      const preferredEntries = entries.filter((entry) => entry.status === "preferred");
      const assignedShifts = shifts.filter((shift) => assignments.some((assignment) => assignment.shift_id === shift.id && assignment.user_id === worker.user_id));
      const assignedEntryStatus = (shift: Shift) => submission && shift.shift_template_id
        ? entries.find((entry) => entry.shift_date === shift.shift_date && entry.shift_template_id === shift.shift_template_id)?.status ?? null
        : null;

      return {
        userId: worker.user_id,
        name: workerName(worker.user_id),
        assignedHours: Math.round(assignedShifts.reduce((sum, shift) => sum + shiftHours(shift), 0) * 10) / 10,
        eligibleOpportunities: eligibleEntries.length,
        preferredOpportunities: preferredEntries.length,
        preferredAssigned: assignedShifts.filter((shift) => assignedEntryStatus(shift) === "preferred").length,
        onlyIfNeededAssigned: assignedShifts.filter((shift) => assignedEntryStatus(shift) === "only_if_needed").length
      };
    }).filter((metric) => metric.eligibleOpportunities > 0 || metric.assignedHours > 0);

    const nextFindings: Finding[] = [];
    const comparableHours = nextMetrics.filter((metric) => metric.eligibleOpportunities > 0);
    if (comparableHours.length >= 2) {
      const sorted = [...comparableHours].sort((a, b) => a.assignedHours - b.assignedHours);
      const low = sorted[0];
      const high = sorted[sorted.length - 1];
      const gap = Math.round((high.assignedHours - low.assignedHours) * 10) / 10;
      if (gap >= 8) nextFindings.push({ key: "hours-gap", severity: "warning", title: "פער שעות משמעותי", detail: `${high.name} עם ${high.assignedHours} ש׳ לעומת ${low.name} עם ${low.assignedHours} ש׳ — פער של ${gap} שעות בין עובדים עם זמינות בתקופה.` });
    }

    const preferredComparable = nextMetrics
      .filter((metric) => metric.preferredOpportunities > 0)
      .map((metric) => ({ ...metric, preferredRate: metric.preferredAssigned / metric.preferredOpportunities }));
    if (preferredComparable.length >= 2) {
      const sorted = [...preferredComparable].sort((a, b) => a.preferredRate - b.preferredRate);
      const low = sorted[0];
      const high = sorted[sorted.length - 1];
      const gap = high.preferredRate - low.preferredRate;
      if (gap >= 0.35) nextFindings.push({ key: "preferred-gap", severity: "info", title: "פער במימוש העדפות", detail: `${high.name} קיבל/ה ${Math.round(high.preferredRate * 100)}% מההעדפות שסומנו, לעומת ${Math.round(low.preferredRate * 100)}% אצל ${low.name}.` });
    }

    const totalOnlyIfNeeded = nextMetrics.reduce((sum, metric) => sum + metric.onlyIfNeededAssigned, 0);
    if (nextMetrics.length >= 2 && totalOnlyIfNeeded >= 2) {
      const average = totalOnlyIfNeeded / nextMetrics.length;
      const burdened = [...nextMetrics].sort((a, b) => b.onlyIfNeededAssigned - a.onlyIfNeededAssigned)[0];
      if (burdened.onlyIfNeededAssigned >= 2 && burdened.onlyIfNeededAssigned >= average + 1) nextFindings.push({ key: "only-if-needed", severity: "warning", title: "עומס משמרות ‘רק אם צריך’", detail: `${burdened.name} קיבל/ה ${burdened.onlyIfNeededAssigned} שיבוצים שסומנו ‘רק אם צריך’, יותר משמעותית משאר הצוות.` });
    }

    setMetrics(nextMetrics.sort((a, b) => b.assignedHours - a.assignedHours));
    setFindings(nextFindings);
    setChecking(false);
  }, [availability, periods, submissions, supabase, workerName, workers]);

  useEffect(() => {
    const sync = () => {
      const select = document.querySelector<HTMLSelectElement>(".schedule-period-select");
      const id = select?.value ?? periods[0]?.id ?? "";
      setSelectedPeriodId(id);
      void scan(id);
    };
    sync();
    const root = document.querySelector(".schedule-workbench");
    if (!root) return;
    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(sync, 250);
    });
    observer.observe(root, { subtree: true, attributes: true, childList: true, attributeFilter: ["aria-pressed", "value", "class"] });
    root.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      root.removeEventListener("change", sync);
      window.clearTimeout(timer);
    };
  }, [periods, scan]);

  return <section className="template-list-card no-print" aria-live="polite">
    <div className="template-list-heading">
      <div><p className="eyebrow">Phase 2 · Scheduling Intelligence</p><h2><Scale size={20} /> Fairness</h2><p className="card-muted">בודק פערי שעות והעדפות רק בין עובדים עם הזדמנויות רלוונטיות — ללא שינוי אוטומטי בשיבוץ.</p></div>
      <button type="button" className="button" disabled={checking || !selectedPeriodId} onClick={() => void scan(selectedPeriodId)}><RefreshCw size={15} /> {checking ? "בודק..." : "בדיקה מחדש"}</button>
    </div>

    {!checking && !findings.length ? <div className="submission-banner open"><CheckCircle2 size={18} /><div><strong>לא נמצאו פערים משמעותיים</strong><span>החלוקה הנוכחית לא חוצה את ספי האזהרה של Fairness.</span></div></div> : null}
    {findings.length ? <div className="template-list" style={{ marginTop: 12 }}>{findings.map((finding) => <article className="card" key={finding.key}><div className="mini-row"><Scale size={17} /><span><strong>{finding.title}</strong><small>{finding.detail}</small></span><span className={`badge ${finding.severity === "warning" ? "warning" : "opening"}`}>{finding.severity === "warning" ? "לבדיקה" : "מידע"}</span></div></article>)}</div> : null}

    {metrics.length ? <div className="template-list" style={{ marginTop: 12 }}>
      {metrics.slice(0, 8).map((metric) => <article className="card" key={metric.userId}><div className="mini-row"><span><strong>{metric.name}</strong><small>{metric.assignedHours} שעות · {metric.preferredAssigned}/{metric.preferredOpportunities} העדפות מומשו · {metric.onlyIfNeededAssigned} ‘רק אם צריך’</small></span><span className="badge opening">{metric.eligibleOpportunities} הזדמנויות</span></div></article>)}
    </div> : null}
    <p className="card-muted" style={{ marginTop: 10 }}>Fairness הוא כלי החלטה בלבד. פער יכול להיות מוצדק בגלל זמינות, תפקיד או צורך עסקי — המנהל נשאר בעל ההחלטה הסופית.</p>
  </section>;
}
