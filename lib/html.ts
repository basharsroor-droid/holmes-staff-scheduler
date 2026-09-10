// Escapes a string for interpolation into an HTML attribute or text node.
//
// This existed as three byte-identical private copies (the observability
// error route, the notification email templates, and now the contact route).
// Any place that builds HTML from user-supplied text must use exactly one
// implementation -- a divergence between copies is how an escaping hole gets
// introduced without anyone noticing.
const REPLACEMENTS: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => REPLACEMENTS[character] ?? character);
}
