import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { MessageKind } from "@/lib/hooks/use-status-message";

// Success/error are told apart by more than color alone (icon + text, not
// just a color swap) so it doesn't rely on color perception -- WCAG 1.4.1.
// role="alert" on errors makes screen readers announce them immediately
// (assertive); success keeps role="status" (polite), as it already was.
export function StatusMessage({ message, kind }: { message: string; kind: MessageKind }) {
  if (!message) return null;
  const Icon = kind === "error" ? AlertTriangle : CheckCircle2;
  return (
    <p className={`workspace-status-message ${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon size={16} aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
