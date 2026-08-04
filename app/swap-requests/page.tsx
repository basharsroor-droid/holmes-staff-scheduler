import { PageHeader } from "@/components/dashboard/page-header";
import { SwapRequestsClient } from "@/components/forms/swap-requests-client";
import {
  availability,
  currentEmployeeId,
  employees,
  scheduledShifts,
  shiftTemplates,
  swapRequests
} from "@/lib/mock-data";

export default function SwapRequestsPage() {
  return (
    <>
      <PageHeader
        eyebrow="החלפות משמרת"
        title="בקשות החלפה ואישור מנהל"
        description="עובד יכול לפתוח בקשה, והמנהל רואה סטטוס ואזהרות לפני אישור."
      />
      <SwapRequestsClient
        availability={availability}
        currentEmployeeId={currentEmployeeId}
        employees={employees}
        initialRequests={swapRequests}
        schedule={scheduledShifts}
        templates={shiftTemplates}
      />
    </>
  );
}
