"use client";

import { useCallback, useState } from "react";

export type MessageKind = "success" | "error";

// Every /workspace client component tracked a bare `useState<string>` for
// its "did the action work" message and rendered it with the exact same
// neutral-blue <p className="auth-message">, whether it was confirming a
// save or reporting that something failed -- visually identical either way.
// This is a drop-in replacement: destructure { message, kind, setMessage }
// instead of the old [message, setMessage], and success calls (the
// majority) don't need to change at all since "success" is the default.
export function useStatusMessage() {
  const [state, setState] = useState<{ text: string; kind: MessageKind }>({ text: "", kind: "success" });

  const setMessage = useCallback((text: string, kind: MessageKind = "success") => {
    setState({ text, kind });
  }, []);

  return { message: state.text, kind: state.kind, setMessage };
}
