import { Outlet } from '@tanstack/react-router';
import { ToastProvider } from '@pdlc/ui';
import { LeftNav } from './LeftNav';
import { InitiativeContextBar } from './InitiativeContextBar';
import { CommandPalette } from '../command-palette/CommandPalette';

/**
 * The one layout every route renders inside: left nav + context bar are
 * always present (A5), the command palette listens globally, and toasts
 * are available anywhere via useToast().
 */
export function AppShell() {
  return (
    <ToastProvider>
      <div className="flex h-screen">
        <LeftNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <InitiativeContextBar />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette />
    </ToastProvider>
  );
}
