import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";

export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: ReactNode }) {
  return (
    <main className="legal-page" dir="rtl">
      <header className="legal-header">
        <BrandLogo href="/" />
        <Link href="/">חזרה לאתר</Link>
      </header>
      <article className="legal-document">
        <p className="eyebrow">SHIFT PILOT</p>
        <h1>{title}</h1>
        <p className="legal-updated">עודכן לאחרונה: {updatedAt}</p>
        <div className="legal-notice">מסמך זה נועד להסביר בצורה ברורה את כללי השימוש במערכת. לפני השקה מסחרית רחבה מומלץ להעבירו לבדיקת יועץ משפטי בישראל.</div>
        {children}
      </article>
      <footer className="legal-footer">
        <Link href="/terms">תנאי שימוש</Link>
        <Link href="/privacy">מדיניות פרטיות</Link>
        <Link href="/login">כניסה למערכת</Link>
      </footer>
    </main>
  );
}

