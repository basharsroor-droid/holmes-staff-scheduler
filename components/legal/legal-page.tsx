import Link from "next/link";
import type { ReactNode } from "react";

import { LegalBackLinks } from "@/components/legal/legal-back-links";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function LegalPage({
  title,
  updatedAt,
  children
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <main className="legal-page" dir="rtl">
      <header className="legal-header">
        <LegalBackLinks signedIn={!!user} />
      </header>
      <article className="legal-document">
        <p className="eyebrow">SHIFT PILOT</p>
        <h1>{title}</h1>
        <p className="legal-updated">עודכן לאחרונה: {updatedAt}</p>
        <div className="legal-notice">
          מסמך זה נועד להסביר בצורה ברורה את כללי השימוש במערכת. לפני השקה מסחרית רחבה מומלץ להעבירו לבדיקת יועץ משפטי
          בישראל.
        </div>
        {children}
      </article>
      <footer className="legal-footer">
        <Link href="/terms">תנאי שימוש</Link>
        <Link href="/privacy">מדיניות פרטיות</Link>
        <Link href={user ? "/workspace" : "/login"}>{user ? "חזרה למערכת" : "כניסה למערכת"}</Link>
      </footer>
    </main>
  );
}
