"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";

const SUPPORT_MAILBOX = "support@shiftpilothq.com";

export function ContactForm() {
  const { message, kind, setMessage } = useStatusMessage();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    business: "",
    phone: "",
    teamSize: "",
    message: "",
    website: ""
  });

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (form.name.trim().length < 2 || !form.email.trim() || form.message.trim().length < 5) {
      setMessage("יש למלא שם, כתובת מייל והודעה קצרה", "error");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (response.ok) {
        setSent(true);
        return;
      }
      setMessage(
        response.status === 429
          ? "נשלחו כמה פניות ברצף. נסו שוב עוד דקה, או כתבו לנו ישירות למייל שלמטה"
          : `לא הצלחנו לשלוח את הפנייה. אפשר לכתוב לנו ישירות ל-${SUPPORT_MAILBOX}`,
        "error"
      );
    } catch {
      setMessage(`לא הצלחנו לשלוח את הפנייה. אפשר לכתוב לנו ישירות ל-${SUPPORT_MAILBOX}`, "error");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="contact-sent" role="status">
        <CheckCircle2 size={44} aria-hidden="true" />
        <h2>הפנייה נשלחה</h2>
        <p>נחזור אליך למייל שהשארת, בדרך כלל תוך יום עסקים אחד</p>
        <a className="button" href={`mailto:${SUPPORT_MAILBOX}`}>{SUPPORT_MAILBOX}</a>
      </div>
    );
  }

  return (
    <form className="contact-form grid" onSubmit={submit} noValidate>
      <div className="form-pair">
        <label className="field">
          <span>שם מלא</span>
          <input className="input" autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </label>
        <label className="field">
          <span>כתובת מייל</span>
          <input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
        </label>
      </div>

      <div className="form-pair">
        <label className="field">
          <span>שם העסק <small>(לא חובה)</small></span>
          <input className="input" autoComplete="organization" value={form.business} onChange={(e) => update("business", e.target.value)} />
        </label>
        <label className="field">
          <span>טלפון <small>(לא חובה)</small></span>
          <input className="input" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </label>
      </div>

      <label className="field">
        <span>כמה עובדים בערך? <small>(לא חובה)</small></span>
        <input className="input" inputMode="numeric" placeholder="לדוגמה: 45 עובדים בשני סניפים" value={form.teamSize} onChange={(e) => update("teamSize", e.target.value)} />
      </label>

      <label className="field">
        <span>במה נוכל לעזור?</span>
        <textarea className="input contact-textarea" rows={5} value={form.message} onChange={(e) => update("message", e.target.value)} required />
      </label>

      {/* Honeypot: hidden from people and from assistive tech, visible to naive bots. */}
      <div className="contact-hp" aria-hidden="true">
        <label>
          אתר אינטרנט
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} />
        </label>
      </div>

      <button className="button brand-button" type="submit" disabled={busy}>
        {busy ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
        {busy ? "שולח" : "שליחת הפנייה"}
      </button>

      <StatusMessage message={message} kind={kind} />

      <p className="contact-fallback">
        מעדיפים מייל? <a href={`mailto:${SUPPORT_MAILBOX}`}>{SUPPORT_MAILBOX}</a>
      </p>
    </form>
  );
}
