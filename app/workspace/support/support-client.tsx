"use client";

import { useMemo, useState } from "react";
import { Archive, CheckCircle2, Clock3, LifeBuoy, Loader2, Send } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database";

type Category = Database["public"]["Enums"]["support_ticket_category"];
type Priority = Database["public"]["Enums"]["support_ticket_priority"];
type TicketStatus = Database["public"]["Enums"]["support_ticket_status"];
type Ticket = { id: string; organization_id: string; organization_name: string; created_by: string; category: Category; priority: Priority; subject: string; description: string; status: TicketStatus; resolution_note: string | null; assigned_to: string | null; created_at: string; updated_at: string };

const categories: Record<Category, string> = { technical: "תקלה טכנית", account: "חשבון והרשאות", billing: "חיוב ותשלום", feature: "הצעה לשיפור", other: "נושא אחר" };
const priorities: Record<Priority, string> = { normal: "רגילה", high: "גבוהה", urgent: "דחופה" };
const statuses: Record<TicketStatus, string> = { open: "חדשה", in_progress: "בטיפול", waiting_customer: "ממתינה ללקוח", resolved: "נפתרה", closed: "נסגרה" };

export function SupportClient({ organizationId, currentUserId, canManage, initialTickets, showCreateForm = true }: { organizationId: string; currentUserId: string; canManage: boolean; initialTickets: Ticket[]; showCreateForm?: boolean }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [tickets, setTickets] = useState(initialTickets);
  const [category, setCategory] = useState<Category>("technical");
  const [priority, setPriority] = useState<Priority>("normal");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(initialTickets.map((ticket) => [ticket.id, ticket.resolution_note ?? ""])));
  const [busy, setBusy] = useState("");
  const { message, kind, setMessage } = useStatusMessage();

  async function createTicket() {
    if (subject.trim().length < 4 || description.trim().length < 10) { setMessage("יש לכתוב כותרת ותיאור מפורט של הבעיה.", "error"); return; }
    setBusy("create"); setMessage("");
    const { data, error } = await supabase.from("support_tickets").insert({ organization_id: organizationId, created_by: currentUserId, category, priority, subject: subject.trim(), description: description.trim() })
      .select("id, organization_id, organization_name, created_by, category, priority, subject, description, status, resolution_note, assigned_to, created_at, updated_at").single();
    setBusy("");
    if (error || !data) { setMessage("פתיחת הפנייה נכשלה. נסו שוב בעוד רגע.", "error"); return; }
    setTickets((current) => [data, ...current]); setSubject(""); setDescription(""); setPriority("normal");
    setMessage("הפנייה נפתחה בהצלחה ונשמרה במרכז התמיכה.");
  }

  async function updateTicket(ticket: Ticket, status: TicketStatus) {
    const resolutionNote = notes[ticket.id]?.trim() || null;
    if (["resolved", "closed"].includes(status) && !resolutionNote) {
      setMessage("יש לכתוב עדכון ללקוח לפני פתרון או סגירת הפנייה.", "error");
      return;
    }
    setBusy(ticket.id); setMessage("");
    const { error } = await supabase.from("support_tickets").update({ status, resolution_note: resolutionNote, assigned_to: currentUserId }).eq("id", ticket.id);
    setBusy("");
    if (error) { setMessage("עדכון הפנייה נכשל.", "error"); return; }
    setTickets((current) => current.map((item) => item.id === ticket.id ? { ...item, status, resolution_note: resolutionNote, assigned_to: currentUserId, updated_at: new Date().toISOString() } : item));
    setMessage("סטטוס הפנייה עודכן.");
  }

  return <div className={`template-workbench support-workbench support-experience${showCreateForm ? "" : " support-console-workbench"}`}>
    {showCreateForm ? <section className="template-form-card support-create-card">
      <div><p className="eyebrow">פנייה חדשה</p><h2>איך אפשר לעזור?</h2></div>
      <label className="field"><span>נושא</span><input className="input" maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="למשל: לא ניתן לפרסם את הסידור" /></label>
      <div className="form-grid two"><label className="field"><span>קטגוריה</span><select className="input" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>דחיפות</span><select className="input" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>{Object.entries(priorities).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label className="field"><span>תיאור הבעיה</span><textarea className="textarea" maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="מה ניסיתם לעשות, באיזה מסך ומה בדיוק הופיע? אין לכתוב סיסמאות או מפתחות API." /></label>
      <button className="button primary" disabled={!!busy} onClick={() => void createTicket()}>{busy === "create" ? <Loader2 className="spin" size={16} /> : <Send size={16} />} פתיחת פנייה</button>
      <StatusMessage message={message} kind={kind} />
    </section> : null}
    <section className="template-list-card support-tickets-panel">
      <div className="template-list-heading support-list-heading"><div><p className="eyebrow">מעקב שקוף</p><h2>{canManage ? "פניות העסק" : "הפניות שלי"}</h2></div><span className="badge warning"><Clock3 size={15} /> {tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length} פתוחות</span></div>
      <div className="template-list support-ticket-list">{tickets.map((ticket) => <article className={`card support-ticket priority-${ticket.priority} status-${ticket.status}`} key={ticket.id}>
        <div className="support-ticket-head"><span><strong>{ticket.subject}</strong><small>{canManage ? `${ticket.organization_name} · ` : ""}{categories[ticket.category]} · דחיפות {priorities[ticket.priority]} · {new Date(ticket.created_at).toLocaleDateString("he-IL")}</small></span><span className={`badge ${["resolved", "closed"].includes(ticket.status) ? "success" : ticket.priority === "urgent" ? "critical" : "warning"}`}>{statuses[ticket.status]}</span></div>
        <p className="card-muted">{ticket.description}</p>{ticket.resolution_note ? <p><strong>עדכון טיפול:</strong> {ticket.resolution_note}</p> : null}
        {canManage ? <div className="support-manager-controls"><label className="field"><span>עדכון ללקוח</span><textarea className="textarea" value={notes[ticket.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [ticket.id]: event.target.value }))} placeholder="מה בוצע או איזה מידע נוסף דרוש?" /></label><div className="actions"><button className="button" disabled={!!busy} onClick={() => void updateTicket(ticket, "in_progress")}>קבלה לטיפול</button><button className="button" disabled={!!busy} onClick={() => void updateTicket(ticket, "waiting_customer")}>ממתינה ללקוח</button><button className="button primary" disabled={!!busy} onClick={() => void updateTicket(ticket, "resolved")}>{busy === ticket.id ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />} סימון כנפתרה</button><button className="button danger" disabled={!!busy} onClick={() => void updateTicket(ticket, "closed")}><Archive size={16} /> סגירת פנייה</button></div></div> : null}
      </article>)}</div>
      {!tickets.length ? <div className="empty-template-state"><LifeBuoy size={40} /><h2>עדיין אין פניות</h2><p>פנייה חדשה שתפתחו תופיע כאן עם סטטוס הטיפול.</p></div> : null}
    </section>
  </div>;
}
