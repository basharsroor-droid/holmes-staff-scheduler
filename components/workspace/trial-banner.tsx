import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Read-only indicator of subscription / trial state, shown at the top of the
// workspace home. No enforcement yet -- expiry handling comes with the billing
// screen slice.
const STATUS_WARNING: Partial<Record<string, string>> = {
  past_due: "התשלום נכשל — יש לעדכן את אמצעי התשלום כדי להמשיך.",
  grace_period: "תקופת חסד פעילה — המנוי ממתין לחידוש תשלום.",
  read_only: "החשבון במצב צפייה בלבד. תשלום יפעיל אותו מחדש."
};

function daysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export async function TrialBanner({ organizationId }: { organizationId: string }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!data) return null;

  if (data.status === "trialing") {
    const days = daysLeft(data.trial_ends_at);
    const label =
      days === null ? "תקופת ניסיון פעילה" : days === 0 ? "יום הניסיון האחרון" : days === 1 ? "נותר יום ניסיון אחרון" : `נותרו ${days} ימי ניסיון`;
    return (
      <div className="trial-pill" role="status">
        <b>{label}</b>
        <Link href="/pricing">מסלולים ומחירים</Link>
      </div>
    );
  }

  const warning = STATUS_WARNING[data.status];
  if (warning) {
    return (
      <div className="trial-pill warn" role="status">
        <b>{warning}</b>
        <Link href="/pricing">מסלולים ומחירים</Link>
      </div>
    );
  }

  return null;
}
