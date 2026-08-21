"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import { StatusMessage } from "@/components/workspace/status-message";
import { useStatusMessage } from "@/lib/hooks/use-status-message";

type OrphanedOrganization = { id: string; name: string; memberCount: number };

// The in-app half of App Store guideline 5.1.1(v). Two things make this
// different from the usual destructive button:
//
// 1. It shows the damage before asking for the confirmation, not after. For a
//    sole owner, "delete my account" silently also means "delete the business
//    and lock out everyone in it", and nobody should discover that afterwards.
// 2. The confirmation is the account's own email, typed out. A checkbox or a
//    second "are you sure" is too easy to click through for something with no
//    undo, and the email also proves which account is being deleted -- managers
//    and employees do share devices.
export function DeleteAccount() {
  const [email, setEmail] = useState("");
  const [organizations, setOrganizations] = useState<OrphanedOrganization[]>([]);
  const [deletionBlocked, setDeletionBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const { message, kind, setMessage } = useStatusMessage();

  useEffect(() => {
    let active = true;
    void (async () => {
      const response = await fetch("/api/account/delete");
      if (!active) return;
      setLoading(false);
      if (!response.ok) {
        setMessage("לא הצלחנו לטעון את פרטי החשבון.", "error");
        return;
      }
      const data = await response.json();
      setEmail(data.email ?? "");
      setOrganizations(data.organizationsToDelete ?? []);
      setDeletionBlocked(data.deletionBlocked === true);
    })();
    return () => {
      active = false;
    };
  }, [setMessage]);

  const confirmationMatches = useMemo(
    () => Boolean(email) && confirmation.trim().toLowerCase() === email.toLowerCase(),
    [confirmation, email]
  );
  const blocked = organizations.length > 0 && !acknowledged;

  async function deleteAccount() {
    setBusy(true);
    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmation, acknowledgeOrganizations: organizations.length > 0 })
    });

    if (!response.ok) {
      setBusy(false);
      const data = await response.json().catch(() => ({}));
      // 409 means the server found a business we had not listed yet -- someone
      // else's ownership changed while this page was open. Re-render with what
      // the server just told us instead of deleting on a stale picture.
      if (response.status === 409 && data.organizationsToDelete) {
        setOrganizations(data.organizationsToDelete);
        setAcknowledged(false);
        setMessage("מצב הבעלות בעסק השתנה. בדוק שוב את הפרטים למטה לפני המחיקה.", "error");
        return;
      }
      setMessage("מחיקת החשבון נכשלה. נסה שוב, ואם זה חוזר פנה לתמיכה.", "error");
      return;
    }

    // Full reload rather than a router push: the session cookies were just
    // invalidated server-side, and every cached client component still holds
    // data belonging to an account that no longer exists. router.push() would
    // keep that cache alive across the navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard reload, see above
    window.location.href = "/";
  }

  return (
    <section className="template-list-card danger-zone-card" aria-labelledby="delete-account-title">
      <div className="template-list-heading">
        <div>
          <p className="eyebrow">אזור מסוכן</p>
          <h2 id="delete-account-title"><Trash2 size={20} /> מחיקת החשבון</h2>
        </div>
      </div>
      <p>
        מחיקת החשבון היא סופית ואי אפשר לבטל אותה. הפרטים האישיים שלך, הזמינות
        שהגשת, השיבוצים ובקשות ההחלפה שלך יימחקו. משמרות שכבר עברו יישארו ברישומי
        העסק בלי הפרטים המזהים שלך.
      </p>

      {loading ? (
        <p className="card-muted">טוענים את פרטי החשבון...</p>
      ) : (
        <>
          {deletionBlocked ? (
            <div className="danger-zone-warning" role="status">
              <p>
                <AlertTriangle size={16} aria-hidden="true" />{" "}
                <strong>זהו חשבון בסביבת ההדגמה המשותפת.</strong>
              </p>
              <p>כדי שההדגמה תישאר זמינה ובטוחה, לא ניתן למחוק את החשבון או את סביבת ההדגמה.</p>
            </div>
          ) : null}
          {organizations.length > 0 ? (
            <div className="danger-zone-warning" role="alert">
              <p>
                <AlertTriangle size={16} aria-hidden="true" />{" "}
                <strong>אתה הבעלים הפעיל היחיד של {organizations.length === 1 ? "עסק" : "העסקים"} הבא{organizations.length === 1 ? "" : "ים"}.</strong>
              </p>
              <p>
                מחיקת החשבון תמחק {organizations.length === 1 ? "אותו" : "אותם"} לגמרי — כולל
                הסניפים, הסידורים והמשמרות — וכל שאר חברי הצוות יאבדו גישה.
              </p>
              <ul>
                {organizations.map((organization) => (
                  <li key={organization.id}>
                    <strong>{organization.name}</strong>
                    {organization.memberCount > 0 ? ` — ${organization.memberCount} חברי צוות נוספים יאבדו גישה` : " — אין חברי צוות נוספים"}
                  </li>
                ))}
              </ul>
              <p className="card-muted">
                רוצה שהעסק ימשיך לפעול בלעדיך? העבר קודם את הבעלות לחבר צוות אחר
                דרך ניהול הצוות, ואז חזור לכאן — המחיקה תיגע רק בחשבון שלך.
              </p>
            </div>
          ) : null}

          {deletionBlocked ? null : confirming ? (
            <div className="danger-zone-confirm">
              {organizations.length > 0 ? (
                <label className="checkbox-row danger-zone-acknowledge">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                  />
                  <span>
                    אני מבין ש{organizations.length === 1 ? "העסק" : "העסקים"} שלמעלה
                    {organizations.length === 1 ? " יימחק" : " יימחקו"} יחד עם החשבון שלי.
                  </span>
                </label>
              ) : null}
              <label className="field">
                <span>להמשך, הקלד את כתובת המייל של החשבון: <strong>{email}</strong></span>
                <input
                  className="input"
                  type="email"
                  dir="ltr"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
              <div className="danger-zone-actions">
                <button
                  className="button danger"
                  disabled={busy || !confirmationMatches || blocked}
                  onClick={() => void deleteAccount()}
                >
                  <Trash2 size={15} /> {busy ? "מוחקים..." : "מחיקה סופית של החשבון"}
                </button>
                <button className="button" disabled={busy} onClick={() => { setConfirming(false); setConfirmation(""); setAcknowledged(false); }}>
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <button className="button danger" onClick={() => setConfirming(true)}>
              <Trash2 size={15} /> אני רוצה למחוק את החשבון
            </button>
          )}
        </>
      )}

      <StatusMessage message={message} kind={kind} />
    </section>
  );
}
