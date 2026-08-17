import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { SecuritySettings } from "@/components/auth/security-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SupportSecurityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: supportAgent } = await supabase.from("platform_support_agents")
    .select("user_id").eq("user_id", user.id).maybeSingle();
  if (!supportAgent) redirect("/workspace");

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader">
      <div>
        <Link href="/support" className="back-link"><ArrowRight size={17} /> חזרה למסוף התמיכה</Link>
        <p className="eyebrow">חשבון אישי</p>
        <h1><ShieldCheck /> אבטחת חשבון</h1>
        <p>ניהול אימות דו-שלבי לחשבון שלך. מומלץ במיוחד לנציגי תמיכה — יש לכם גישה לפניות מכל הלקוחות.</p>
      </div>
    </header>
    <SecuritySettings />
  </main>;
}
