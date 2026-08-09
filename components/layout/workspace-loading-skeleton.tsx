// Shared route-level loading UI for the workspace area. Every
// app/workspace/*/page.tsx is a force-dynamic server component that does
// its own Supabase fetches before it can render anything; without a
// loading.tsx per route, navigating between them showed a blank white
// flash for however long that fetch took. This is a plain server
// component (no "use client") -- Next.js renders it immediately while
// the real page.tsx is still awaiting its data.
export function WorkspaceLoadingSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <main className="skeleton-page" dir="rtl" aria-busy="true" aria-label="טוען...">
      <div className="skeleton-block skeleton-title" />
      {Array.from({ length: cards }, (_, index) => (
        <div className="skeleton-block skeleton-card" key={index} />
      ))}
    </main>
  );
}
