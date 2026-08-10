/**
 * Landing page placeholder for the Context Engine's My Day view (A4),
 * which ships in Phase 4. Phase 0 just proves the shell renders inside
 * AppShell; the real page replaces this with ranked MyDayItems once
 * apps/api exposes them.
 */
export function MyDayPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-lg font-semibold text-fg">My Day</h1>
      <p className="text-sm text-muted">
        This is where decisions awaiting you, blockers, and today&rsquo;s meeting prep will appear
        once the Context Engine (Phase 4) ships. Press{' '}
        <kbd className="rounded border border-border px-1">⌘K</kbd> to try the command palette.
      </p>
    </div>
  );
}
