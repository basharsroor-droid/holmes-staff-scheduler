import Link from "next/link";
import type { Metadata } from "next";

import { BrandLogo } from "@/components/brand/brand-logo";

export const metadata: Metadata = {
  title: "אודות | ShiftPilot",
  description: "מי אנחנו, למי המערכת מיועדת, ואיך ShiftPilot נבנתה."
};

// Track P0/P1-03 ("trust and identity") asked for a standalone About page
// with clear value, separate from the implied promise on the homepage.
// Reuses the same .legal-* layout classes as /terms and /privacy for
// visual consistency, but without LegalPage's "consult a lawyer" notice --
// that's specific to legal documents, not relevant here.
export default function AboutPage() {
  return (
    <main className="legal-page" dir="rtl">
      <header className="legal-header">
        <BrandLogo href="/" />
        <Link href="/">חזרה לאתר</Link>
      </header>
      <article className="legal-document">
        <p className="eyebrow">SHIFT PILOT</p>
        <h1>מי אנחנו</h1>
        <section>
          <h2>מה זה ShiftPilot</h2>
          <p>
            כלי תפעולי לניהול סידורי עבודה לעסקים מבוססי-משמרות: הגשת זמינות
            לעובד, בניית ופרסום סידור למנהל, ובקשות החלפה בין השניים — הכול
            במקום אחד, בעברית, בלי גיליונות אקסל וקבוצות וואטסאפ נפרדות.
          </p>
        </section>
        <section>
          <h2>למי זה מיועד</h2>
          <p>
            עסקים עם צוות שעובד במשמרות — סניף אחד או כמה, מנהל אחד או כמה
            רמות ניהול. כל עסק מבודד לגמרי בבסיס הנתונים (הפרדה ברמת השורה,
            לא רק ברמת הממשק), כך שאין דרך שעובד או מנהל בעסק אחד יראה נתונים
            של עסק אחר.
          </p>
        </section>
        <section>
          <h2>איך זה נבנה</h2>
          <p>
            ShiftPilot נבנה כדי לפתור בעיה אמיתית: ניהול סידור עבודה שמתבסס
            על קבוצת וואטסאפ וגיליון משותף, עם כל מה שזה גורר — בלבולים,
            החלפות שאף אחד לא עוקב אחריהן, ומנהל שצריך לזכור הכול בראש. הפיתוח
            מלווה בפיילוט אמיתי מול עסק אמיתי (הולמס פלייס), לא רק תרחישי
            בדיקה תיאורטיים.
          </p>
        </section>
        <section>
          <h2>מה חשוב לנו</h2>
          <p>
            שקיפות על מה שעובד ומה שעדיין לא — לא מבטיחים פיצ׳ר שלא קיים.
            עברית כשפת ממשק ראשית, לא תרגום מאוחר. ומענה אמיתי כשמשהו נשבר:
            <Link href="/support"> מרכז התמיכה</Link> ומייל{" "}
            <a href="mailto:support@shiftpilothq.com">support@shiftpilothq.com</a>{" "}
            מגיעים לבן אדם, לא לתפריט אוטומטי.
          </p>
        </section>
      </article>
      <footer className="legal-footer">
        <Link href="/terms">תנאי שימוש</Link>
        <Link href="/privacy">מדיניות פרטיות</Link>
        <Link href="/login">כניסה למערכת</Link>
      </footer>
    </main>
  );
}
