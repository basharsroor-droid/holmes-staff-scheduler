import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock3, MessagesSquare, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { ContactForm } from "@/app/contact/contact-form";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { SiteNavbar } from "@/components/marketing/site-navbar";

export const metadata: Metadata = {
  title: "צרו קשר | ShiftPilot",
  description: "שאלה על מסלול, בקשה להצעה מותאמת לרשת, או ליווי בהקמה — נחזור אליכם תוך יום עסקים אחד"
};

const assurances = [
  { icon: Clock3, title: "תשובה תוך יום עסקים", text: "פנייה שמגיעה עד 16:00 בדרך כלל נענית באותו יום" },
  { icon: MessagesSquare, title: "בלי שיחת מכירה כפויה", text: "אפשר גם פשוט לשאול שאלה ולקבל תשובה במייל" },
  { icon: ShieldCheck, title: "הפרטים נשארים אצלנו", text: "משמשים רק כדי לחזור אליכם, ולא מועברים לאף גורם" }
];

export default function ContactPage() {
  return <main className="marketing-site contact-page" dir="rtl">
    <div className="marketing-navbar-shell absolute inset-x-0 top-0 z-40">
      <SiteNavbar />
    </div>

    <section className="pro-section contact-section">
      <ScrollReveal className="section-heading">
        <p className="pro-kicker dark">צרו קשר</p>
        <h2>נשמח לשמוע מכם</h2>
        <p>שאלה על מסלול, הצעה מותאמת לרשת עם כמה סניפים, או ליווי בהקמה — כתבו לנו ונחזור אליכם, גם בלי חשבון</p>
      </ScrollReveal>

      <div className="contact-grid">
        <ContactForm />

        <aside className="contact-aside">
          <ul className="contact-assurances">
            {assurances.map((item) => (
              <li key={item.title}>
                <item.icon size={19} aria-hidden="true" />
                <span><strong>{item.title}</strong><small>{item.text}</small></span>
              </li>
            ))}
          </ul>

          <div className="contact-alt">
            <h3>רוצים להתחיל לבד?</h3>
            <p>אפשר לפתוח סביבת עבודה ולהתחיל 30 ימי ניסיון בלי לדבר עם אף אחד ובלי כרטיס אשראי</p>
            <Link className="button brand-button" href="/onboarding">פתיחת סביבת עבודה <ArrowLeft size={16} /></Link>
            <Link className="pricing-text-link" href="/pricing">או להשוות מסלולים</Link>
          </div>
        </aside>
      </div>
    </section>

    <footer className="pro-footer">
      <div className="pro-footer-top">
        <div className="pro-footer-brand"><BrandLogo href="/" /><p>זמינות, סידורי עבודה והחלפות משמרת — במקום אחד</p></div>
        <nav className="pro-footer-col" aria-label="גישה למערכת"><h4>גישה למערכת</h4><Link href="/pricing">תמחור</Link><Link href="/login">כניסה למערכת</Link><Link href="/onboarding">פתיחת סביבת עבודה</Link><Link href="/demo">סיור במוצר</Link></nav>
        <nav className="pro-footer-col" aria-label="מידע ותמיכה"><h4>מידע ותמיכה</h4><Link href="/about">מי אנחנו</Link><Link href="/contact">צרו קשר</Link><a href="mailto:support@shiftpilothq.com">support@shiftpilothq.com</a><Link href="/terms">תנאי שימוש</Link><Link href="/privacy">מדיניות פרטיות</Link></nav>
      </div>
      <div className="pro-footer-wordmark" aria-hidden="true">ShiftPilot</div>
      <small>© 2026 ShiftPilot · כל הזכויות שמורות</small>
    </footer>
  </main>;
}
