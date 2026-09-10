// Escapes a string for interpolation into an HTML attribute or text node.
//
// This existed as three byte-identical private copies (the observability
// error route, the notification email templates, and now the contact route).
// Any place that builds HTML from user-supplied text should use exactly one
// implementation -- a divergence between copies is how an escaping hole gets
// introduced without anyone noticing.
//
// One deliberate exception: lib/email/templates.ts keeps its own copy, because
// the unit tests load that file raw through Node's type-stripping loader, which
// cannot resolve a local import. See the comment there.
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
