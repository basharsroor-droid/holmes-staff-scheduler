"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";

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
//
// Forwards a ref to the underlying <input> so a caller's submit handler can
// read event.target's live DOM value as a fallback. Password managers,
// accessibility text-insertion, and some WebKit autofill paths can set the
// native input value without dispatching the "input" event React listens on
// -- when that happens the visible field is correct but the `value` prop
// this component was given is stale, and reading only React state at submit
// time silently sends the wrong password. Caught this via repeated
// "invalid credentials" failures where the same string, re-typed through a
// DOM-level input (a desktop browser's automation, not WebKit's native text
// insertion), authenticated every time -- the field never lied, the state
// closure did.
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { label, value, onChange, autoComplete, onEnter },
  ref
) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="field">
      <span>{label}</span>
      <div className="password-field">
        <input
          ref={ref}
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
});
