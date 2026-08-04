import { PageHeader } from "@/components/dashboard/page-header";
import { ManagerScheduleBuilder } from "@/components/forms/manager-schedule-builder";
import { SubmissionAccessControl } from "@/components/forms/submission-access-control";
import {
  availability,
  employees,
  monthDays,
  scheduledShifts,
  shiftTemplates
} from "@/lib/mock-data";

export default function ManagerSchedulePage() {
  return (
    <>
      <PageHeader
        eyebrow="מנהל/ת"
        title="בניית סידור חודשי"
        description="שולחן שיבוץ חודשי עם תבניות משמרת, עובדים זמינים, שמירת טיוטה, פרסום ואזהרות בזמן אמת."
      />
      <SubmissionAccessControl />
      <ManagerScheduleBuilder
        availability={availability}
        days={monthDays}
        employees={employees}
        initialSchedule={scheduledShifts}
        templates={shiftTemplates}
      />
    </>
  );
}
