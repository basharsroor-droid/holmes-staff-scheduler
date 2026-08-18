// Shown by public/sw.js only when a page navigation genuinely can't
// reach the network. Deliberately self-contained (inline styles, no
// dependency on app/globals.css) rather than reusing the
// .recovery-page/.recovery-card classes that not-found.tsx and
// error.tsx use: this page's whole job is to still render correctly
// with zero network access, and Next.js's CSS bundle is
// content-hashed per build -- precaching it by name in public/sw.js
// would silently break on every deploy. Colors below are copied from
// the brand tokens in app/globals.css (--bg, --primary, --ink,
// --muted, --surface, --line) rather than referencing them, for the
// same reason.
export default function OfflinePage() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 24,
        background: "#f5f7fb",
        fontFamily: '"Arial", "Noto Sans Hebrew", "Segoe UI", sans-serif'
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 22, color: "#172033", direction: "ltr" }}>
        Shift<span style={{ color: "#2158c9" }}>Pilot</span>
      </div>
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #d8e0ea",
          borderRadius: 16,
          padding: "32px 28px",
          maxWidth: 420,
          textAlign: "center"
        }}
      >
        <p style={{ margin: "0 0 8px", color: "#2158c9", fontWeight: 700, fontSize: 13 }}>אין חיבור לאינטרנט</p>
        <h1 style={{ margin: "0 0 12px", fontSize: 22, color: "#172033" }}>אי אפשר להתחבר כרגע.</h1>
        <p style={{ margin: 0, color: "#667085", fontSize: 15, lineHeight: 1.7 }}>
          בדקו את החיבור לרשת ונסו שוב. נתוני הסידור צריכים חיבור פעיל כדי להישאר מעודכנים.
        </p>
      </section>
    </main>
  );
}
