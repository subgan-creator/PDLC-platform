/**
 * Initiative-scoped context bar (A5 UX NFR). Empty shell for Phase 0 — once
 * the Initiative Workspace ships (Phase 1) this renders the active
 * initiative's key, health, phase, and quick actions, and stays present
 * across every workspace so switching modules never loses "which
 * initiative am I in" context (this bar is the antidote to A4's
 * context-switch problem).
 */
export function InitiativeContextBar() {
  return (
    <div
      role="region"
      aria-label="Initiative context"
      className="flex h-12 items-center border-b border-border px-4 text-sm text-muted"
    >
      No initiative selected.
    </div>
  );
}
