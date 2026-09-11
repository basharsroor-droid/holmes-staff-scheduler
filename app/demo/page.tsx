import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { RolesShowcase } from "@/components/marketing/roles-showcase";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { SiteNavbar } from "@/components/marketing/site-navbar";

// /demo is a static product tour that leads to the free trial (F1, owner
// decision 2026-09-11). There is deliberately no live demo account here: the
// old mock-data demo app was removed, and a shared login in production would
// be a security surface. The steps below are the real product loop, the same
// one tests/staging/workspace-scheduling-flow.spec.ts proves end to end.

export const metadata: Metadata = {
  title: "סיור במוצר | ShiftPilot",
  description:
    "ככה עובדת ShiftPilot: הגשת זמינות, בניית סידור, פרסום לצוות והחלפות משמרת — ואז 30 ימי ניסיון בסביבה שלכם"
};

const productLoop = [
  {
    n: "01",
    title: "מגדירים את העסק",
    text: "סניפים, מחלקות וסוגי משמרות עם שעות ומספר עובדים — ומזמינים את הצוות בקישור אישי"
  },
  {
    n: "02",
    title: "פותחים חודש עבודה",
    text: "העובדים מסמנים מהטלפון באילו משמרות הם זמינים ושולחים למנהל עד מועד ההגשה"
  },
  {
    n: "03",
    title: "בונים את הסידור ומפרסמים",
    text: "המנהל רואה מי הגיש ומי חסר, משבץ לפי הזמינות ומפרסם לצוות בלחיצה"
  },
  {
    n: "04",
    title: "כל עובד רואה את המשמרות שלו",
    text: "הסידור המעודכן והמשמרת הקרובה — בלי קבוצות וואטסאפ ובלי צילומי מסך של אקסל"
  },
  {
    n: "05",
    title: "החלפות עם אישור מתועד",
    text: "עובד מבקש החלפה, העמית מאשר, המנהל מאשר סופית — והסידור מתעדכן לבד"
  }
];

export default function DemoPage() {
  return (
    <main className="marketing-site" dir="rtl">
      <div className="marketing-navbar-shell absolute inset-x-0 top-0 z-40">
        <SiteNavbar />
      </div>

      <section className="pro-section process-section">
        <ScrollReveal className="section-heading centered">
          <p className="pro-kicker dark">סיור במוצר</p>
          <h1>ככה נראה חודש עבודה ב־ShiftPilot</h1>
          <p>
            מהגשת הזמינות ועד החלפת משמרת מאושרת, בחמישה שלבים ובמקום אחד — והדרך הטובה ביותר לראות את זה היא בסביבה שלכם:
            30 ימי ניסיון, בלי כרטיס אשראי
          </p>
        </ScrollReveal>
        <div className="process-timeline">
          {productLoop.map((step, index) => (
            <ScrollReveal className="process-step" delay={index * 70} key={step.n}>
              <b>{step.n}</b>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <RolesShowcase />

      <section className="final-cta">
        <ScrollReveal>
          <BrandLogo light />
          <h2>רוצים לראות את זה על העסק שלכם?</h2>
          <p>פותחים סביבת עבודה בכמה דקות, מזמינים את הצוות ומתחילים מהחודש הבא</p>
          <div>
            <Link className="button brand-button large" href="/onboarding">
              פתיחת סביבת עבודה <ArrowLeft size={18} />
            </Link>
            <Link className="button glass-button large" href="/pricing">
              השוואת מסלולים
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <footer className="pro-footer">
        <div className="pro-footer-top">
          <div className="pro-footer-brand">
            <BrandLogo href="/" />
            <p>זמינות, סידורי עבודה והחלפות משמרת — במקום אחד</p>
          </div>
          <nav className="pro-footer-col" aria-label="גישה למערכת">
            <h4>גישה למערכת</h4>
            <Link href="/pricing">תמחור</Link>
            <Link href="/login">כניסה למערכת</Link>
            <Link href="/onboarding">פתיחת סביבת עבודה</Link>
          </nav>
          <nav className="pro-footer-col" aria-label="מידע ותמיכה">
            <h4>מידע ותמיכה</h4>
            <Link href="/about">מי אנחנו</Link>
            <Link href="/contact">צרו קשר</Link>
            <a href="mailto:support@shiftpilothq.com">support@shiftpilothq.com</a>
            <Link href="/terms">תנאי שימוש</Link>
            <Link href="/privacy">מדיניות פרטיות</Link>
          </nav>
        </div>
        <div className="pro-footer-wordmark" aria-hidden="true">
          ShiftPilot
        </div>
        <small>© 2026 ShiftPilot · כל הזכויות שמורות</small>
      </footer>
    </main>
  );
}
