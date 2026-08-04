"use client";

import { useState } from "react";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import type { AuthUser } from "@/lib/auth-config";
import {
  defaultBranchId,
  defaultOrganizationId,
  demoOrganization,
  organizationDisplayName,
  productConfig
} from "@/lib/app-config";
import { AUTH_USER_KEY, DEMO_USER_KEY, LOCAL_USERS_KEY } from "@/lib/local-storage-keys";

type StoredUser = AuthUser & { password: string };

function saveAuthUser(user: AuthUser, persist: boolean) {
  const normalizedUser = normalizeAuthUser(user);
  const storage = persist ? window.localStorage : window.sessionStorage;
  storage.setItem(AUTH_USER_KEY, JSON.stringify(normalizedUser));
  storage.setItem(DEMO_USER_KEY, normalizedUser.id);
}

function getLocalUsers() {
  return JSON.parse(window.localStorage.getItem(LOCAL_USERS_KEY) ?? "[]") as StoredUser[];
}

function normalizeAuthUser<T extends AuthUser>(user: T): T {
  return {
    ...user,
    organizationId: user.organizationId ?? defaultOrganizationId,
    branchId: user.branchId ?? defaultBranchId
  };
}

function saveLocalUser(user: StoredUser) {
  const localUsers = getLocalUsers();
  window.localStorage.setItem(
    LOCAL_USERS_KEY,
    JSON.stringify([
      ...localUsers.filter((item) => item.nationalId !== user.nationalId),
      user
    ])
  );
}

export function AuthGate() {
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [passwordChangeUser, setPasswordChangeUser] = useState<StoredUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function enterSystem(user: AuthUser) {
    saveAuthUser(user, rememberDevice);
    window.location.href = user.role === "manager" ? "/pilot" : "/employee";
  }

  async function login() {
    setIsLoading(true);
    setMessage("");
    const localUsers = getLocalUsers();
    const localUser = localUsers.find(
      (user) => user.nationalId === loginId && user.password === loginPassword
    );

    if (localUser) {
      setIsLoading(false);
      const normalizedLocalUser = normalizeAuthUser(localUser);
      if (normalizedLocalUser.mustChangePassword) {
        setPasswordChangeUser(normalizedLocalUser);
        setMessage("זו כניסה ראשונה. צריך להחליף סיסמה לפני שממשיכים.");
        return;
      }
      enterSystem(normalizedLocalUser);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nationalId: loginId, password: loginPassword })
      });
      const data = await response.json();
      setIsLoading(false);

      if (!data.ok) {
        setMessage(data.message ?? "לא הצלחנו להתחבר");
        return;
      }

      const apiUser = normalizeAuthUser(data.user as AuthUser);
      if (apiUser.mustChangePassword) {
        setPasswordChangeUser({ ...apiUser, password: loginPassword });
        setMessage("זו כניסה ראשונה. צריך להחליף סיסמה לפני שממשיכים.");
        return;
      }
      enterSystem(apiUser);
    } catch {
      setIsLoading(false);
      setMessage("לא הצלחנו להתחבר כרגע. נסו שוב.");
    }
  }

  function changeInitialPassword() {
    setMessage("");
    if (!passwordChangeUser) return;
    if (newPassword.length < 6) {
      setMessage("סיסמה חדשה חייבת להכיל לפחות 6 תווים.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("הסיסמאות החדשות לא זהות.");
      return;
    }
    if (newPassword === passwordChangeUser.password) {
      setMessage("בחרו סיסמה חדשה, לא את הסיסמה הראשונית.");
      return;
    }
    const updatedUser: StoredUser = {
      ...passwordChangeUser,
      password: newPassword,
      mustChangePassword: false,
      emailVerified: true
    };
    saveLocalUser(updatedUser);
    enterSystem(updatedUser);
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="brand-mark">{productConfig.shortName}</div>
        <h1>{productConfig.name}</h1>
        <p>
          {productConfig.tagline}. זה אזור פרטי לעובדים ולמנהלים, עם משתמשים
          שנוצרים מראש וכניסה ראשונה עם החלפת סיסמה חובה.
        </p>
        <div className="card-muted">
          דמו פעיל: {demoOrganization.businessName} · {demoOrganization.branchName}
        </div>
      </section>

      <section className="auth-card">
        {passwordChangeUser ? (
          <div className="grid">
            <ShieldCheck size={36} color="var(--primary)" />
            <div>
              <h2>החלפת סיסמה ראשונית</h2>
              <p className="lead">
                {passwordChangeUser.firstName}, לפני הכניסה למערכת צריך לבחור סיסמה
                אישית חדשה. סביבת העבודה שלך:{" "}
                <strong>{organizationDisplayName(passwordChangeUser.organizationId)}</strong>.
              </p>
            </div>
            <div className="field">
              <label>סיסמה חדשה</label>
              <input
                className="input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="field">
              <label>אישור סיסמה חדשה</label>
              <input
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            <button className="button primary" onClick={changeInitialPassword}>
              שמירה וכניסה
            </button>
            <div className="card-muted">
              הסיסמה החדשה נשמרת בדמו על המכשיר הזה. בחיבור אמיתי נשמור אותה
              מאובטחת בצד שרת.
            </div>
          </div>
        ) : (
          <div className="grid">
            <div className="auth-title-row">
              <LockKeyhole size={22} />
              <h2>כניסה למערכת</h2>
            </div>
            <div className="field">
              <label>ת.ז / שם משתמש</label>
              <input
                className="input"
                inputMode="numeric"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
              />
            </div>
            <div className="field">
              <label>סיסמה</label>
              <input
                className="input"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
              />
            </div>
            <label className="checkbox-row">
              <input
                checked={rememberDevice}
                type="checkbox"
                onChange={(event) => setRememberDevice(event.target.checked)}
              />
              שמור כניסה בטלפון הזה
            </label>
            <button className="button primary" disabled={isLoading} onClick={login}>
              <KeyRound size={16} />
              כניסה
            </button>
            <div className="card-muted">
              דמו Holmes: בשאר `111111111` / `123456`, ולריה `222222222` / `123456`.
              דמו עסק נוסף: דנה `333333333` / `123456`.
              אחרי הכניסה הראשונה תתבקשו להחליף סיסמה.
            </div>
          </div>
        )}

        {message ? <p className="auth-message">{message}</p> : null}
      </section>
    </div>
  );
}
