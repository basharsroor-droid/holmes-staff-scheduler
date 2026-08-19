import { PageHeader } from "@/components/dashboard/page-header";
import { AvailabilityForm } from "@/components/forms/availability-form";
import { demoOrganization } from "@/lib/app-config";
import {
  availability,
  currentEmployeeId,
  monthDays,
  shiftTemplates
} from "@/lib/mock-data";

export default function AvailabilityPage() {
  return (
    <>
      <PageHeader
        eyebrow="הגשת זמינות"
        title={`זמינות לחודש ${demoOrganization.scheduleMonthLabel}`}
        description="העובד מסמן זמינות, אי זמינות, העדפה או רק אם צריך. המנהל/ת יראו את הנתונים בזמן השיבוץ."
      />
      <AvailabilityForm
        days={monthDays}
        employeeId={currentEmployeeId}
        initialAvailability={availability}
        templates={shiftTemplates}
      />
    </>
  );
}
