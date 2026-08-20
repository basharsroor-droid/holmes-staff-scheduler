import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { DeleteAccount } from "@/components/auth/delete-account";
import { SecuritySettings } from "@/components/auth/security-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkspaceSecurityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  return <main className="workspace-home" dir="rtl">
    <header className="workspace-subheader">
      <div>
        <Link href="/workspace" className="back-link"><ArrowRight size={17} /> חזרה לסביבת העבודה</Link>
        <p className="eyebrow">חשבון אישי</p>
        <h1><ShieldCheck /> אבטחת חשבון</h1>
        <p>ניהול אימות דו-שלבי לחשבון שלך. זו הגדרה אישית — לא משפיעה על שאר חברי הצוות.</p>
      </div>
    </header>
    <SecuritySettings />
    <DeleteAccount />
  </main>;
}
