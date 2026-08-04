import { PageHeader } from "@/components/dashboard/page-header";
import { ExportScheduleButton } from "@/components/schedule/export-schedule-button";
import { FinalSchedule } from "@/components/schedule/final-schedule";
import { WarningsPanel } from "@/components/schedule/warnings-panel";
import {
  availability,
  employees,
  monthDays,
  scheduledShifts,
  shiftTemplates
} from "@/lib/mock-data";
import { validateSchedule } from "@/lib/shift-validation";

export default function FullSchedulePage() {
  const warnings = validateSchedule(
    scheduledShifts,
    employees,
    availability,
    shiftTemplates
  );
  const publishedSchedule = scheduledShifts.filter((shift) => shift.status === "published");

  return (
    <>
      <PageHeader
        eyebrow="לוח עבודה סופי"
        title="סידור יולי 2026"
        description="תצוגה סופית וברורה: בכל משמרת מופיע רק העובד המשובץ. משמרות פתוחות מופיעות כפתוח."
        actions={
          <ExportScheduleButton
            employees={employees}
            schedule={publishedSchedule}
            templates={shiftTemplates}
          />
        }
      />

      <div className="split">
        <section className="card">
          <FinalSchedule
            days={monthDays}
            employees={employees}
            schedule={publishedSchedule}
            templates={shiftTemplates}
          />
        </section>
        <WarningsPanel
          schedule={publishedSchedule}
          templates={shiftTemplates}
          warnings={warnings}
        />
      </div>
    </>
  );
}
