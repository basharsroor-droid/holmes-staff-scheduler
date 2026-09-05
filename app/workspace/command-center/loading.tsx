export default function CommandCenterLoading() {
  return (
    <main className="workspace-home" dir="rtl" aria-busy="true">
      <header className="workspace-subheader">
        <div>
          <p className="eyebrow">Manager Command Center</p>
          <h1>טוען את מרכז השליטה…</h1>
          <p>אוספים את מצב הסידור, הכיסוי והבקשות שממתינות להחלטה.</p>
        </div>
      </header>
      <section className="template-list-card">
        <div className="submission-banner open">
          <div><strong>טוען נתונים</strong><span>המסך יתעדכן אוטומטית כשהנתונים יהיו מוכנים.</span></div>
        </div>
      </section>
    </main>
  );
}
