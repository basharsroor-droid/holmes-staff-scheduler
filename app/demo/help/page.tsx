import { LifeBuoy, Mail, Search } from "lucide-react";

const commonQuestions = [
  {
    title: "לא מצליחים להגיש זמינות?",
    answer: "ודאו שההגשה פתוחה, סמנו לפחות אפשרות אחת בכל יום ולחצו על שמירת הגשה. סביבת הדמו נשמרת מקומית בלבד."
  },
  {
    title: "בקשת החלפה לא מופיעה?",
    answer: "עברו למסך החלפות ובדקו אם הבקשה ממתינה לאישור. בדמו אפשר להיכנס גם כמנהל כדי לראות את שלב האישור."
  },
  {
    title: "רוצים להתחיל מחדש?",
    answer: "יציאה מהדמו וכניסה מחדש מאפסות את מצב ההדגמה. אין בדמו נתוני עסק אמיתיים או מידע שנשמר בשרת."
  }
];

export default function DemoHelpPage() {
  return <>
    <section className="page-heading">
      <p className="eyebrow">סביבת הדגמה · עזרה ושירות</p>
      <h1><LifeBuoy /> עזרה ותמיכה</h1>
      <p>פתרונות מהירים לשאלות נפוצות ודרך ברורה ליצור קשר אם צריך עזרה נוספת.</p>
    </section>
    <div className="help-center">
      <section className="template-list-card help-category" aria-labelledby="demo-help-common-title">
        <div className="template-list-heading">
          <div>
            <p className="eyebrow">פתרון עצמי</p>
            <h2 id="demo-help-common-title"><Search size={20} /> שאלות נפוצות בדמו</h2>
          </div>
        </div>
        <div className="faq-grid help-faq-grid">
          {commonQuestions.map((question) => <article className="card" key={question.title}>
            <h3>{question.title}</h3>
            <p>{question.answer}</p>
          </article>)}
        </div>
      </section>
      <section className="template-list-card help-category help-fallback" aria-labelledby="demo-help-contact-title">
        <Mail aria-hidden="true" />
        <div>
          <h2 id="demo-help-contact-title">עדיין צריכים עזרה?</h2>
          <p>סביבת הדמו אינה פותחת פנייה אמיתית, אבל צוות ShiftPilot זמין לשאלות ולסיוע.</p>
          <a className="button primary" href="mailto:support@shiftpilothq.com">שליחת מייל לתמיכה</a>
        </div>
      </section>
    </div>
  </>;
}
