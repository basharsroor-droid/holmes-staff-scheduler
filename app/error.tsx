"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { reportClientError } from "@/lib/observability-client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("ShiftPilot route error", error);
    reportClientError({ name: error.name, message: error.message, digest: error.digest, source: "route-boundary" });
  }, [error]);

  return (
    <main className="recovery-page" dir="rtl">
      <BrandLogo href="/" />
      <section className="recovery-card" role="alert">
        <AlertTriangle size={42} />
        <p className="eyebrow">תקלה זמנית</p>
        <h1>לא הצלחנו לטעון את העמוד.</h1>
        <p>המידע שלך לא נמחק. אפשר לנסות שוב, ואם התקלה נמשכת לחזור למסך הכניסה.</p>
        <div>
          <button className="button primary" type="button" onClick={reset}><RefreshCw size={17} /> ניסיון נוסף</button>
          <Link className="button" href="/login">חזרה לכניסה</Link>
        </div>
        {error.digest ? <small>מספר תקלה: {error.digest}</small> : null}
      </section>
    </main>
  );
}
