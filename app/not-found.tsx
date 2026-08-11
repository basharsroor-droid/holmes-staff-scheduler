import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

export default function NotFound() {
  return (
    <main className="recovery-page" dir="rtl">
      <BrandLogo href="/" />
      <section className="recovery-card">
        <p className="eyebrow">404</p>
        <h1>העמוד שחיפשת לא נמצא.</h1>
        <p>ייתכן שהקישור השתנה או שאין לך צורך במסלול הזה יותר.</p>
        <div><Link className="button primary" href="/">חזרה לאתר</Link><Link className="button" href="/login">כניסה למערכת</Link></div>
      </section>
    </main>
  );
}
