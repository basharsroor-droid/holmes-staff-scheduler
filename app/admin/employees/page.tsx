import { PageHeader } from "@/components/dashboard/page-header";
import { AdminEmployeesClient } from "@/components/forms/admin-employees-client";
import { employees } from "@/lib/mock-data";

export default function AdminEmployeesPage() {
  return (
    <>
      <PageHeader
        eyebrow="אדמין"
        title="ניהול עובדים"
        description="מסך ניהול בסיסי לעובדים, הרשאות פתיחה/סגירה, רמת ותק ופרטי כניסה."
      />
      <AdminEmployeesClient initialEmployees={employees} />
    </>
  );
}
