type EmailTemplate = { subject: string; preview: string; heading: string; body: string; cta: string; href: string };

const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }

export function notificationEmail(templateKey: string, payload: Record<string, unknown>, appUrl: string): EmailTemplate {
  const month = typeof payload.month === "number" ? monthNames[payload.month - 1] : "";
  const year = typeof payload.year === "number" ? String(payload.year) : "";
  const shift = [text(payload.name), text(payload.shift_date), text(payload.start_time)].filter(Boolean).join(" · ");
  const templates: Record<string, EmailTemplate> = {
    schedule_published: { subject: `סידור העבודה ${month} ${year} פורסם`, preview: "הסידור החדש מחכה לך ב-ShiftPilot", heading: "סידור העבודה פורסם", body: `הסידור לחודש ${month} ${year} זמין עכשיו לצפייה.`, cta: "צפייה במשמרות שלי", href: "/workspace/my-shifts" },
    shift_assignment_changed: { subject: "עדכון בשיבוץ שלך", preview: "בוצע שינוי במשמרת שלך", heading: "השיבוץ שלך עודכן", body: shift || "בוצע שינוי בשיבוץ שלך. כדאי להיכנס ולבדוק את הפרטים.", cta: "בדיקת המשמרות", href: "/workspace/my-shifts" },
    shift_reminder: { subject: "תזכורת: המשמרת שלך מתחילה בעוד כשעה", preview: shift, heading: "המשמרת מתקרבת", body: shift || "המשמרת שלך מתחילה בעוד כשעה.", cta: "צפייה בפרטי המשמרת", href: "/workspace/my-shifts" },
    availability_reminder: { subject: "תזכורת להגשת זמינות", preview: "נותרו מספר ימים להגשה", heading: "עוד לא הגשת זמינות", body: "חלון הגשת הזמינות עומד להיסגר. אפשר להשלים את הבחירות תוך כמה דקות.", cta: "הגשת זמינות", href: "/workspace/availability" },
    availability_closing: { subject: "היום נסגרת הגשת הזמינות", preview: "זו ההזדמנות האחרונה להגשה", heading: "הגשת הזמינות נסגרת היום", body: "לא מצאנו הגשה מלאה שלך לחודש הקרוב. לאחר מועד הסגירה ייתכן שלא יהיה אפשר לערוך אותה.", cta: "להגשה עכשיו", href: "/workspace/availability" },
    swap_request_received: { subject: "בקשת החלפת משמרת חדשה", preview: "ממתינה לתגובה שלך", heading: "התקבלה בקשת החלפה", body: "עובד או עובדת מבקשים להחליף איתך משמרת.", cta: "פתיחת הבקשה", href: "/workspace/shift-swaps" },
    swap_waiting_manager: { subject: "החלפת משמרת ממתינה לאישור", preview: "נדרשת החלטת מנהל", heading: "החלפה מוכנה לאישור", body: "שני העובדים אישרו את ההחלפה והיא ממתינה להחלטת מנהל.", cta: "בדיקת הבקשה", href: "/workspace/shift-swaps" },
    swap_approved: { subject: "החלפת המשמרת אושרה", preview: "הסידור עודכן", heading: "ההחלפה אושרה", body: "בקשת ההחלפה אושרה והסידור עודכן בהתאם.", cta: "צפייה בסידור", href: "/workspace/my-shifts" },
    swap_rejected: { subject: "בקשת ההחלפה נדחתה", preview: "הסידור נשאר ללא שינוי", heading: "הבקשה נדחתה", body: "בקשת ההחלפה נסגרה ללא שינוי בסידור.", cta: "צפייה בבקשה", href: "/workspace/shift-swaps" },
    swap_cancelled: { subject: "בקשת ההחלפה בוטלה", preview: "הבקשה נסגרה", heading: "הבקשה בוטלה", body: "בקשת ההחלפה בוטלה והסידור נשאר ללא שינוי.", cta: "פתיחת ההחלפות", href: "/workspace/shift-swaps" }
  };
  return templates[templateKey] ?? { subject: "עדכון חדש מ-ShiftPilot", preview: "יש עדכון חדש במערכת", heading: "יש לך עדכון חדש", body: "עדכון חדש מחכה לך בסביבת העבודה.", cta: "פתיחת ShiftPilot", href: "/workspace" };
}

export function renderEmail(template: EmailTemplate, appUrl: string) {
  const href = new URL(template.href, appUrl).toString();
  return `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(template.subject)}</title></head><body style="margin:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#142640"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(template.preview)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:600px;background:#fff;border-radius:22px;border:1px solid #dce5f1;overflow:hidden"><tr><td style="padding:26px 32px;background:#142640;color:#fff;font-size:24px;font-weight:800">ShiftPilot</td></tr><tr><td style="padding:38px 32px;text-align:right"><p style="margin:0 0 10px;color:#52657d;font-size:14px">ניהול משמרות חכם ופשוט</p><h1 style="margin:0 0 18px;font-size:28px">${escapeHtml(template.heading)}</h1><p style="margin:0 0 28px;line-height:1.8;font-size:16px">${escapeHtml(template.body)}</p><a href="${escapeHtml(href)}" style="display:inline-block;background:#2f6fed;color:#fff;text-decoration:none;padding:13px 22px;border-radius:12px;font-weight:700">${escapeHtml(template.cta)}</a></td></tr><tr><td style="padding:20px 32px;background:#f8fafc;color:#6b7b90;font-size:12px;text-align:right">הודעה זו נשלחה לפי העדפות ההתראות שלך ב-ShiftPilot.</td></tr></table></td></tr></table></body></html>`;
}
