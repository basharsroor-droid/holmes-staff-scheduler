"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { LOCAL_DEMO_USERS, type AuthUser } from "@/lib/auth-config";
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

  function login() {
    setIsLoading(true);
    setMessage("");
    const localUsers = getLocalUsers();
    const localUser = localUsers.find(
      (user) =>
        (user.nationalId === loginId || user.username === loginId) &&
        user.password === loginPassword
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

    setIsLoading(false);
    setMessage("ת.ז או סיסמה לא נכונים");
  }

  function enterDemo(role: "manager" | "employee") {
    const demoUser = LOCAL_DEMO_USERS.find((user) => user.role === role);
    if (demoUser) enterSystem(demoUser);
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
    <div className="auth-page demo-auth-flow">
      <div className="section-glow blue" style={{ width: 420, height: 420, top: -120, insetInlineStart: -100 }} aria-hidden="true" />
      <div className="section-glow violet" style={{ width: 340, height: 340, bottom: -140, insetInlineEnd: -60 }} aria-hidden="true" />
      <Link href="/" className="auth-back-link"><ArrowRight size={15} /> חזרה לאתר</Link>

      <section className="auth-hero demo-auth-intro">
        <BrandLogo light />
        <p>
          {productConfig.tagline}. אזור פרטי לעובדים ולמנהלים, בדיוק כמו
          שהמערכת האמיתית עובדת — בלי חיבור לנתוני לקוחות או לחשבון Production.
        </p>
        <div className="card-muted">
          דמו פעיל: {demoOrganization.businessName} · {demoOrganization.branchName}
        </div>
      </section>

      <section className="auth-card demo-auth-card">
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
              <label htmlFor="demo-new-password">סיסמה חדשה</label>
              <input
                id="demo-new-password"
                className="input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="demo-confirm-password">אישור סיסמה חדשה</label>
              <input
                id="demo-confirm-password"
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
              <h2>בחירת תצוגת דמו</h2>
            </div>
            <p className="lead">בחרו תפקיד כדי להתנסות בסביבת ההדגמה המקומית.</p>
            <button className="button primary" onClick={() => enterDemo("manager")}>
              <KeyRound size={16} /> כניסה לדמו כמנהל/ת
            </button>
            <button className="button" onClick={() => enterDemo("employee")}>
              <KeyRound size={16} /> כניסה לדמו כעובד/ת
            </button>
            <div className="card-muted">
              סביבת הדמו נשמרת בדפדפן בלבד ואינה מעניקה גישה ל־Supabase או לנתוני Production.
            </div>
            <details>
                <summary>כניסה למשתמש מקומי שנוצר בדמו</summary>
            <div className="field">
              <label htmlFor="demo-login-id">ת.ז / שם משתמש</label>
              <input
                id="demo-login-id"
                className="input"
                autoComplete="username"
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="demo-login-password">סיסמה</label>
              <input
                id="demo-login-password"
                className="input"
                type="password"
                autoComplete="current-password"
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
              פרטי המשתמש המקומי נשמרים במכשיר הזה בלבד.
            </div>
            </details>
          </div>
        )}

        {message ? <p className="auth-message">{message}</p> : null}
      </section>
    </div>
  );
}
