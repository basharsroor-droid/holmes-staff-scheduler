import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowDown, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

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

      <section className="demo-tour-hero">
        <div className="demo-tour-hero-glow" aria-hidden="true" />
        <div className="demo-tour-hero-copy">
          <p className="pro-kicker">המוצר האמיתי, בלי חשבון דמו משותף</p>
          <h1>
            חודש של תיאומים <span>בסידור אחד ברור</span>
          </h1>
          <p>
            המנהל בונה ומפרסם סידור, כל עובד רואה את המשמרות שלו בטלפון,
            והחלפות עוברות לאישור ומתעדכנות במקום אחד.
          </p>
          <div className="demo-tour-actions">
            <Link className="button brand-button large" href="#product-screens">
              לצפייה במסכים <ArrowDown size={18} />
            </Link>
            <Link className="button glass-button large" href="/onboarding">
              התחילו 30 יום חינם <ArrowLeft size={18} />
            </Link>
          </div>
          <div className="demo-tour-assurances">
            <span><CheckCircle2 size={17} /> ללא כרטיס אשראי</span>
            <span><ShieldCheck size={17} /> סביבה פרטית לכל עסק</span>
          </div>
        </div>
      </section>

      <section className="pro-section demo-product-screens" id="product-screens" aria-labelledby="product-screens-title">
        <ScrollReveal className="section-heading centered">
          <p className="pro-kicker dark">הדברים החשובים באמת</p>
          <h2 id="product-screens-title">כך העבודה עוברת מהמנהל לצוות — וחזרה</h2>
          <p>
            זהו הממשק האמיתי של ShiftPilot עם נתוני הדגמה פיקטיביים — לא מסכי שיווק ולא אפליקציית mock.
          </p>
        </ScrollReveal>

        <div className="demo-value-strip" aria-label="יתרונות מרכזיים">
          <span><CheckCircle2 size={18} /> לוח חודשי וחגי ישראל</span>
          <span><CheckCircle2 size={18} /> זמינות ושיבוץ במקום אחד</span>
          <span><CheckCircle2 size={18} /> החלפות עם אישור מתועד</span>
        </div>

        <div className="demo-tour-chapters">
          <ScrollReveal className="demo-tour-chapter demo-manager-chapter">
            <div className="demo-chapter-copy">
              <small>01 · למנהל</small>
              <h3>רואים את כל החודש ובונים את הסידור במקום אחד</h3>
              <p>
                לוח חודשי, זמינות העובדים, כיסוי המשמרות וחגי ישראל נמצאים מול העיניים.
                כשהסידור מוכן, מפרסמים אותו לכל הצוות בלחיצה.
              </p>
              <ul>
                <li><CheckCircle2 size={18} /> יודעים מי הגיש ומי עדיין חסר</li>
                <li><CheckCircle2 size={18} /> משבצים לפי זמינות וצורכי העסק</li>
                <li><CheckCircle2 size={18} /> מפרסמים גרסה אחת ועדכנית</li>
              </ul>
            </div>
            <div className="demo-manager-gallery">
              <figure className="demo-browser-frame demo-browser-primary">
                <Image
                  alt="מסך בניית הסידור החודשי למנהל ב־ShiftPilot"
                  className="demo-manager-shot"
                  height={1000}
                  priority
                  sizes="(max-width: 900px) 94vw, 720px"
                  src="/demo/product-tour/manager/01-schedule-builder.png"
                  width={1440}
                />
                <figcaption>בניית הסידור</figcaption>
              </figure>
              <figure className="demo-browser-frame demo-browser-secondary">
                <Image
                  alt="מסך סידור עבודה שפורסם לצוות ב־ShiftPilot"
                  className="demo-manager-shot"
                  height={1000}
                  sizes="(max-width: 900px) 88vw, 430px"
                  src="/demo/product-tour/manager/02-published-schedule.png"
                  width={1440}
                />
                <figcaption>הסידור פורסם לצוות</figcaption>
              </figure>
            </div>
          </ScrollReveal>

          <ScrollReveal className="demo-tour-chapter demo-employee-chapter">
            <div className="demo-phone-gallery">
              <figure className="demo-phone-frame">
                <Image
                  alt="מסך הגשת זמינות של עובד בטלפון ב־ShiftPilot"
                  className="demo-phone-shot"
                  height={932}
                  sizes="(max-width: 600px) 42vw, 270px"
                  src="/demo/product-tour/employee/01-availability-submitted.png"
                  width={430}
                />
                <figcaption>הזמינות נשלחה</figcaption>
              </figure>
              <figure className="demo-phone-frame demo-phone-featured">
                <Image
                  alt="מסך המשמרות האישיות של עובד בטלפון ב־ShiftPilot"
                  className="demo-phone-shot"
                  height={932}
                  sizes="(max-width: 600px) 46vw, 290px"
                  src="/demo/product-tour/employee/02-my-shifts.png"
                  width={430}
                />
                <figcaption>המשמרות שלי</figcaption>
              </figure>
            </div>
            <div className="demo-chapter-copy">
              <small>02 · לעובדים</small>
              <h3>כל עובד יודע מתי הוא עובד</h3>
              <p>
                העובדים שולחים זמינות מהטלפון ורואים רק את המשמרות הרלוונטיות להם,
                כולל השעה, הסניף והמשמרת הקרובה.
              </p>
              <strong>פחות שאלות בקבוצה. פחות גרסאות. יותר ודאות לצוות.</strong>
            </div>
          </ScrollReveal>

          <ScrollReveal className="demo-tour-chapter demo-swap-chapter">
            <div className="demo-chapter-copy">
              <small>03 · שינויים בלי כאוס</small>
              <h3>מהבקשה בטלפון לאישור המנהל</h3>
              <p>
                עובד מבקש החלפה ומסביר למה. המנהל רואה את הבקשה, מאשר או דוחה,
                והסידור נשאר מעודכן ומתועד — בלי לחפש הודעות בוואטסאפ.
              </p>
            </div>
            <div className="demo-swap-gallery">
              <figure className="demo-browser-frame">
                <Image
                  alt="מסך אישור בקשת החלפת משמרת למנהל ב־ShiftPilot"
                  className="demo-manager-shot"
                  height={1000}
                  sizes="(max-width: 900px) 94vw, 690px"
                  src="/demo/product-tour/manager/03-swap-approval.png"
                  width={1440}
                />
                <figcaption>המנהל בודק ומאשר</figcaption>
              </figure>
              <figure className="demo-phone-frame demo-swap-phone">
                <Image
                  alt="מסך בקשת החלפת משמרת של עובד בטלפון ב־ShiftPilot"
                  className="demo-phone-shot"
                  height={932}
                  sizes="(max-width: 600px) 48vw, 250px"
                  src="/demo/product-tour/employee/03-swap-request.png"
                  width={430}
                />
                <figcaption>העובד שולח בקשה</figcaption>
              </figure>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="pro-section process-section">
        <ScrollReveal className="section-heading centered">
          <p className="pro-kicker dark">הלופ המלא</p>
          <h2>ככה נראה חודש עבודה ב־ShiftPilot</h2>
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
