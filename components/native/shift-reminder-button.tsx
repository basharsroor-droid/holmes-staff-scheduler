"use client";

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ShiftReminderButtonProps = {
  shiftId: string;
  shiftName: string;
  shiftDate: string;
  startTime: string;
  branchName: string;
};

function notificationIdForShift(shiftId: string) {
  // Local notification IDs must be signed 32-bit integers. Keep the mapping
  // deterministic so the same shift can be found and cancelled later.
  let hash = 0;
  for (const character of `shiftpilot:${shiftId}`) {
    hash = (Math.imul(31, hash) + character.charCodeAt(0)) | 0;
  }
  return hash || 1;
}

export function ShiftReminderButton({
  shiftId,
  shiftName,
  shiftDate,
  startTime,
  branchName
}: ShiftReminderButtonProps) {
  // Start false to keep the server-rendered HTML identical to the first
  // client render. The iOS bridge is available only after hydration.
  const [native, setNative] = useState(false);
  const notificationId = useMemo(() => notificationIdForShift(shiftId), [shiftId]);
  const shiftStartsAt = useMemo(() => new Date(`${shiftDate}T${startTime}`), [shiftDate, startTime]);
  const reminderAt = useMemo(() => new Date(shiftStartsAt.getTime() - 60 * 60 * 1000), [shiftStartsAt]);
  const [scheduled, setScheduled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setNative(Capacitor.isNativePlatform()), []);

  useEffect(() => {
    if (!native) return;
    let active = true;
    void LocalNotifications.getPending()
      .then(({ notifications }) => {
        if (active) setScheduled(notifications.some((notification) => notification.id === notificationId));
      })
      .catch(() => {
        // A pending-state read is helpful but not required to render the shift.
      });
    return () => { active = false; };
  }, [native, notificationId]);

  if (!native || reminderAt <= new Date()) return null;

  async function toggleReminder() {
    setBusy(true);
    setMessage("");
    try {
      if (scheduled) {
        await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
        setScheduled(false);
        setMessage("התזכורת בוטלה");
        return;
      }

      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== "granted") {
        setMessage("כדי לקבל תזכורת, יש לאפשר התראות בהגדרות ה־iPhone.");
        return;
      }

      await LocalNotifications.schedule({
        notifications: [{
          id: notificationId,
          title: `משמרת בעוד שעה · ${shiftName}`,
          body: `${startTime.slice(0, 5)} · ${branchName}`,
          schedule: { at: reminderAt, allowWhileIdle: true },
          sound: "default",
          threadIdentifier: "shift-reminders",
          extra: { route: "/workspace/my-shifts", shiftId }
        }]
      });
      setScheduled(true);
      setMessage("תזכורת נקבעה לשעה לפני המשמרת");
    } catch {
      setMessage("לא הצלחנו לעדכן את התזכורת. אפשר לנסות שוב.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="native-shift-reminder">
      <button
        type="button"
        className={`button ${scheduled ? "secondary" : "primary"}`}
        disabled={busy}
        aria-pressed={scheduled}
        onClick={toggleReminder}
      >
        {busy ? <Loader2 className="spin" size={16} /> : scheduled ? <BellOff size={16} /> : <Bell size={16} />}
        {scheduled ? "ביטול תזכורת" : "תזכורת שעה לפני"}
      </button>
      {message ? <small role="status">{message}</small> : null}
    </div>
  );
}
