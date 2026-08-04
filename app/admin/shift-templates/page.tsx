import { PageHeader } from "@/components/dashboard/page-header";
import { ShiftTemplatesClient } from "@/components/forms/shift-templates-client";
import { shiftTemplates } from "@/lib/mock-data";

export default function ShiftTemplatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="אדמין"
        title="תבניות משמרת"
        description="מבנה גמיש לחודשים רגילים, יוני וקיץ. בשלב הבא הנתונים יישמרו במסד נתונים."
      />
      <ShiftTemplatesClient initialTemplates={shiftTemplates} />
    </>
  );
}
