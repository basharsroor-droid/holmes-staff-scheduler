"use client";

import { Capacitor } from "@capacitor/core";
import { Bell, BellOff, Loader2, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { PushNotifications, type PushToken } from "@/lib/native/push-notifications";

type PushState = "checking" | "unavailable" | "prompt" | "granted" | "denied";

async function saveToken(token: PushToken) {
  const response = await fetch("/api/push/devices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: token.value })
  });
  if (!response.ok) throw new Error("Device registration failed");
}

async function registerDevice() {
  let registrationHandle: Awaited<ReturnType<typeof PushNotifications.addListener>> | undefined;
  let errorHandle: Awaited<ReturnType<typeof PushNotifications.addListener>> | undefined;

  try {
    let resolveRegistration!: () => void;
    let rejectRegistration!: (error: Error) => void;
    const registered = new Promise<void>((resolve, reject) => {
      resolveRegistration = resolve;
      rejectRegistration = reject;
    });

    registrationHandle = await PushNotifications.addListener("registration", async (token) => {
      try {
        await saveToken(token);
        resolveRegistration();
      } catch (error) {
        rejectRegistration(error instanceof Error ? error : new Error("Device registration failed"));
      }
    });
    errorHandle = await PushNotifications.addListener("registrationError", (error) => {
      rejectRegistration(new Error(error.error));
    });

    await PushNotifications.register();
    await Promise.race([
      registered,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Registration timed out")), 15_000))
    ]);
  } finally {
    await registrationHandle?.remove();
    await errorHandle?.remove();
  }
}

export function PushNotificationPermission() {
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("PushNotifications")) {
      setState("unavailable");
      return;
    }

    void PushNotifications.checkPermissions().then(async ({ receive }) => {
      if (receive !== "granted") {
        if (!cancelled) setState(receive === "denied" ? "denied" : "prompt");
        return;
      }

      setBusy(true);
      try {
        await registerDevice();
        if (!cancelled) {
          setState("granted");
          setMessage("ההתראות פעילות והמכשיר רשום לקבלת עדכונים.");
        }
      } catch {
        if (!cancelled) {
          setState("prompt");
          setMessage("ההרשאה פעילה, אך רישום המכשיר נכשל. לחצו כדי לנסות שוב.");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }).catch(() => setState("unavailable"));

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") {
        setState("denied");
        setMessage("ההרשאה נחסמה. ניתן להפעיל התראות דרך הגדרות ה־iPhone.");
        return;
      }

      await registerDevice();
      setState("granted");
      setMessage("ההתראות הופעלו בהצלחה במכשיר הזה.");
    } catch {
      setMessage("לא הצלחנו לרשום את המכשיר להתראות. אפשר לנסות שוב.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unavailable") return null;

  return (
    <section className="template-list-card push-permission-card" aria-labelledby="push-permission-title">
      <div className="template-list-heading notification-preferences-heading">
        <div>
          <p className="eyebrow">עדכונים בזמן אמת</p>
          <h2 id="push-permission-title"><Smartphone size={20} /> התראות במכשיר</h2>
        </div>
        <span className={`badge ${state === "granted" ? "success" : state === "denied" ? "danger" : "warning"}`}>
          {state === "granted" ? <Bell size={15} /> : <BellOff size={15} />}
          {state === "checking" ? "בודק..." : state === "granted" ? "פעיל" : state === "denied" ? "חסום" : "לא הופעל"}
        </span>
      </div>
      <p>קבלת עדכון כאשר סידור מתפרסם, השיבוץ משתנה, הגשת הזמינות נסגרת או בקשת החלפה מתעדכנת.</p>
      {state !== "granted" ? (
        <button className="button primary" type="button" disabled={busy || state === "checking"} onClick={() => void enable()}>
          {busy ? <Loader2 className="spin" size={16} /> : <Bell size={16} />}
          {busy ? "מפעיל..." : state === "denied" ? "בדיקה מחדש" : "הפעלת התראות"}
        </button>
      ) : null}
      {message ? <p className="form-message" role="status">{message}</p> : null}
    </section>
  );
}
