import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Dialog, Input } from '@pdlc/ui';

interface Command {
  id: string;
  label: string;
  run: () => void;
}

/**
 * ⌘K command palette shell (A5: "Command palette (⌘K) for everything").
 * Phase 0 wires the global shortcut, focus management (via Dialog), and a
 * filterable list against a static command set; later phases register
 * real commands (jump to initiative, create story, ...) through this same
 * component rather than building a second palette.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const commands: Command[] = [
    {
      id: 'my-day',
      label: 'Go to My Day',
      run: () => {
        void navigate({ to: '/' });
      },
    },
  ];
  const filtered = commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Jump to anything, ⌘K to toggle."
    >
      <Input
        label="Search commands"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type a command…"
      />
      <ul className="mt-3 flex flex-col gap-1" role="listbox" aria-label="Command results">
        {filtered.map((command) => (
          <li key={command.id}>
            <button
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => {
                command.run();
                setOpen(false);
              }}
              className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted/10 focus-visible:outline-none"
            >
              {command.label}
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-2 py-2 text-sm text-muted">No matching commands.</li>
        )}
      </ul>
    </Dialog>
  );
}
