import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { ScrollToTop } from "@/components/marketing/scroll-to-top";
import { SiteNavbar } from "@/components/marketing/site-navbar";
import { ADDONS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "תמחור | ShiftPilot",
  description: "מסלולים, מחירי השקה ותקופת ניסיון של 30 יום ללא כרטיס אשראי."
};

const trialSteps = [
  { n: "01", title: "פותחים חשבון", text: "נרשמים עם שם ומייל ומאמתים את הכתובת. אין צורך בכרטיס אשראי." },
  { n: "02", title: "בוחרים מסלול", text: "עונים על כמה שאלות קצרות ומקבלים המלצה. אפשר לשנות מסלול בהמשך." },
  { n: "03", title: "מקימים את העסק", text: "מגדירים סניף ומחלקה, יוצרים סוגי משמרת ומזמינים את הצוות." },
  { n: "04", title: "מתחילים לעבוד", text: "בונים סידור ראשון ומפרסמים אותו — 30 יום מלאים כדי להתרשם." }
];

const faq = [
  {
    q: "צריך כרטיס אשראי בשביל הניסיון?",
    a: "לא. הניסיון הוא ל-30 יום מלאים, ללא הזנת אמצעי תשלום."
  },
  {
    q: "מה קורה בסוף הניסיון?",
    a: "אם רוכשים מנוי, העבודה נמשכת כרגיל ללא אובדן מידע. אם לא — החשבון עובר לצפייה בלבד, המידע נשמר לפחות 60 יום, ואפשר לשלם ולהפעיל אותו מחדש מאותה נקודה בכל עת."
  },
  {
    q: "לפי מה נקבע המחיר?",
    a: "לפי מספר העובדים הפעילים, המחלקות, המנהלים והסניפים. עובד לא פעיל נשמר בהיסטוריה ואינו נספר לחיוב."
  },
  {
    q: "אפשר לשדרג או להוריד מסלול?",
    a: "כן. כל שינוי במחיר מוצג לאישור מראש, עם המחיר החדש ומועד תחילת החיוב, לפני שהוא נכנס לתוקף. רק בעל העסק או מנהל חיוב מורשה יכול לשנות מנוי."
  },
  {
    q: "יש הנחה לתשלום שנתי?",
    a: "כן. תשלום שנתי שקול לקבלת חודשיים ללא תשלום לעומת התשלום החודשי."
  }
];

export default function PricingPage() {
  return <main className="marketing-site" dir="rtl">
    <div className="marketing-navbar-shell absolute inset-x-0 top-0 z-40">
      <SiteNavbar />
    </div>
    <ScrollToTop />

    <section className="pro-section pricing-hero">
      <div className="section-glow blue" style={{ width: 420, height: 420, top: -120, left: -80 }} aria-hidden="true" />
      <ScrollReveal className="section-heading centered">
        <p className="pro-kicker dark">מחיר השקה</p>
        <h2>תמחור פשוט, לפי הגודל של העסק</h2>
        <p>חבילה חודשית ברורה שכוללת מכסת עובדים, מחלקות ומנהלים, לצד תוספות פשוטות להתרחבות. מתחילים תמיד ב-30 יום ניסיון ללא כרטיס אשראי.</p>
      </ScrollReveal>
    </section>

    <section className="pro-section pricing-section" id="plans">
      <PricingPlans />
    </section>

    <section className="pro-section addons-section">
      <ScrollReveal className="section-heading centered">
        <p className="pro-kicker dark">תוספות בתשלום</p>
        <h2>מרחיבים את החשבון כשצריך</h2>
        <p>אפשר להוסיף משאבים מעבר למכסת המסלול. לפני כל הגדלת חיוב מוצג המחיר החדש ונדרש אישור מפורש של בעל העסק.</p>
      </ScrollReveal>
      <ScrollReveal className="example-table-wrap" tabIndex={0} role="region" aria-label="תוספות בתשלום">
        <table className="example-table">
          <thead><tr><th>תוספת</th><th>מחיר מומלץ</th></tr></thead>
          <tbody>
            {ADDONS.map((addon) => (
              <tr key={addon.label}><td><b>{addon.label}</b></td><td>{addon.price}</td></tr>
            ))}
          </tbody>
        </table>
      </ScrollReveal>
    </section>

    <section className="pro-section process-section" id="trial">
      <ScrollReveal className="section-heading centered">
        <p className="pro-kicker dark">איך הניסיון עובד</p>
        <h2>ארבעה צעדים עד לסידור הראשון</h2>
        <p>30 יום מספיקים למחזור עבודה שלם — הקמה, הזמנת עובדים, קבלת זמינות, סידור, פרסום והחלפות.</p>
      </ScrollReveal>
      <div className="process-timeline">
        {trialSteps.map((step, index) => (
          <ScrollReveal className="process-step" delay={index * 70} key={step.n}>
            <b>{step.n}</b>
            <div><h3>{step.title}</h3><p>{step.text}</p></div>
          </ScrollReveal>
        ))}
      </div>
    </section>

    <section className="pro-section faq-section">
      <ScrollReveal className="section-heading">
        <p className="pro-kicker dark">שאלות נפוצות</p>
        <h2>על תמחור וניסיון</h2>
      </ScrollReveal>
      <div className="faq-grid">
        {faq.map((item, index) => (
          <details key={item.q} open={index === 0}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>

    <section className="final-cta">
      <ScrollReveal>
        <BrandLogo light />
        <h2>מתחילים ב-30 יום ניסיון.</h2>
        <p>פותחים סביבת עבודה לעסק, בוחרים מסלול ומקימים את הצוות — בלי שיחת מכירה ובלי כרטיס אשראי.</p>
        <div>
          <Link className="button brand-button large" href="/onboarding">פתיחת סביבת עבודה <ArrowLeft size={18} /></Link>
          <Link className="button glass-button large" href="/demo">צפייה בדמו</Link>
        </div>
      </ScrollReveal>
    </section>

    <div className="mobile-sticky-actions"><Link href="/demo">דמו</Link><Link href="/onboarding">פתיחת סביבת עבודה <ArrowLeft size={16} /></Link></div>

    <footer className="pro-footer">
      <div className="pro-footer-top">
        <div className="pro-footer-brand"><BrandLogo href="/" /><p>זמינות, סידורי עבודה והחלפות משמרת — במקום אחד.</p></div>
        <nav className="pro-footer-col" aria-label="גישה למערכת"><h4>גישה למערכת</h4><Link href="/pricing">תמחור</Link><Link href="/login">כניסה למערכת</Link><Link href="/onboarding">פתיחת סביבת עבודה</Link><Link href="/demo">סביבת הדמו</Link></nav>
        <nav className="pro-footer-col" aria-label="מידע ותמיכה"><h4>מידע ותמיכה</h4><Link href="/about">מי אנחנו</Link><Link href="/support">תמיכה</Link><a href="mailto:support@shiftpilothq.com">support@shiftpilothq.com</a><Link href="/terms">תנאי שימוש</Link><Link href="/privacy">מדיניות פרטיות</Link></nav>
      </div>
      <div className="pro-footer-wordmark" aria-hidden="true">ShiftPilot</div>
      <small>© 2026 ShiftPilot. כל הזכויות שמורות.</small>
    </footer>
  </main>;
}
