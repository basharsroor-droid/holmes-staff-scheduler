"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/observability-client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError({ name: error.name, message: error.message, digest: error.digest, source: "global-boundary" });
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body>
        <main className="recovery-page">
          <section className="recovery-card" role="alert">
            <p className="eyebrow">SHIFT PILOT</p>
            <h1>אירעה תקלה זמנית.</h1>
            <p>אפשר לנסות לטעון מחדש. הפעולה האחרונה לא תישלח שוב ללא אישורך.</p>
            <button className="button primary" type="button" onClick={reset}>טעינה מחדש</button>
          </section>
        </main>
      </body>
    </html>
  );
}
