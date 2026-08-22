"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  // "current-password" on the login screen, "new-password" wherever one is
  // being chosen -- keeping this explicit stops iOS from offering a saved
  // password on a screen that's setting a fresh one.
  autoComplete: "current-password" | "new-password";
  onEnter?: () => void;
};

// A password input the person can actually read back. Without this, iOS
// silently autofills a saved password over an empty-looking field and there's
// no way to tell it apart from what you just typed -- which is exactly how a
// demo account ends up locked out with "invalid login credentials".
export function PasswordField({ label, value, onChange, autoComplete, onEnter }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="field">
      <span>{label}</span>
      <div className="password-field">
        <input
          className="input"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          // Revealed passwords are still not dictionary words; keep the
          // keyboard from "helpfully" rewriting them.
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && onEnter) onEnter(); }}
        />
        <button
          type="button"
          className="password-reveal"
          aria-label={visible ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  );
}
