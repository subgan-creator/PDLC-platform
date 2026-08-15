import { Link } from '@tanstack/react-router';
import { Button, cn } from '@pdlc/ui';
import { useAuth } from '../auth/auth-context';

interface NavItem {
  to: string;
  label: string;
}

// Module map per CLAUDE.md — order matches the PDLC lifecycle (A3). Items
// for modules not yet built (Phase 2+) are intentionally omitted rather
// than linked-and-broken; add them as each phase ships.
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'My Day' },
  { to: '/initiatives', label: 'Initiatives' },
  { to: '/roadmap', label: 'Roadmap' },
];

/**
 * Consistent left nav per A5 UX NFR ("Consistent left nav + initiative-scoped
 * context bar"). A real `<nav>` landmark with a visible current-page state,
 * not just a color change, so it survives both keyboard and low-vision use.
 */
export function LeftNav() {
  const { devIdentity, signOut } = useAuth();

  return (
    <nav
      aria-label="Primary"
      className="flex w-56 shrink-0 flex-col gap-1 border-r border-border p-3"
    >
      <span className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">
        PDLC Platform
      </span>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={cn('rounded-md px-2 py-2 text-sm font-medium text-fg hover:bg-muted/10')}
          activeProps={{ className: 'bg-primary/10 text-primary', 'aria-current': 'page' }}
        >
          {item.label}
        </Link>
      ))}

      {devIdentity && (
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <span className="px-2 text-xs text-muted">
            Acting as
            <br />
            <span className="font-medium text-fg">
              {devIdentity.displayName ?? devIdentity.userId}
            </span>
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Switch user
          </Button>
        </div>
      )}
    </nav>
  );
}
