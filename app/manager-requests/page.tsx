import { PageHeader } from "@/components/dashboard/page-header";

export default function ManagerRequestsPage() {
  return (
    <>
      <PageHeader
        eyebrow="בקשות להנהלה"
        title="פנייה למנהל/ת"
        description="בשלב הדמו זה אזור לבקשות כלליות: הערות על זמינות, בקשות מיוחדות ושאלות לגבי הסידור."
      />

      <section className="card">
        <h2>בקשה חדשה</h2>
        <div className="grid grid-2">
          <div className="field">
            <label>סוג בקשה</label>
            <select className="select" defaultValue="schedule">
              <option value="schedule">בקשה לגבי הסידור</option>
              <option value="availability">שינוי זמינות</option>
              <option value="personal">בקשה אישית</option>
            </select>
          </div>
          <div className="field">
            <label>דחיפות</label>
            <select className="select" defaultValue="normal">
              <option value="normal">רגיל</option>
              <option value="urgent">דחוף</option>
            </select>
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>פירוט</label>
          <textarea className="textarea" placeholder="כתבו כאן את הבקשה למנהל/ת" />
        </div>
        <button className="button primary" style={{ marginTop: 14 }}>
          שליחה במצב דמו
        </button>
      </section>
    </>
  );
}
