"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function MarkNotificationsReadButton({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);
  const { message, kind, setMessage } = useStatusMessage();

  async function markRead() {
    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("mark_my_notifications_read");
    setBusy(false);
    if (error) {
      setMessage("לא הצלחנו לסמן את ההתראות כנקראו.", "error");
      return;
    }
    setMessage("כל ההתראות סומנו כנקראו.");
    router.refresh();
  }

  return <div>
    <button className="button" disabled={busy || unreadCount === 0} onClick={() => void markRead()}>
      {busy ? <Loader2 className="spin" size={16} /> : <CheckCheck size={16} />}
      סימון הכול כנקרא
    </button>
    <StatusMessage message={message} kind={kind} />
  </div>;
}
