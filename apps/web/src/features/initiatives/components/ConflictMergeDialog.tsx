import type { Initiative } from '@pdlc/shared-types';
import { Button, Dialog } from '@pdlc/ui';

export interface ConflictState {
  current: Initiative;
  /** The patch the user was trying to save when the 409 hit — replayed with the server's version if they choose "Keep mine". */
  pendingPatch: Record<string, unknown>;
}

interface ConflictMergeDialogProps {
  conflict: ConflictState | null;
  onUseServerVersion: () => void;
  onKeepMine: (retryWithVersion: number) => void;
}

/**
 * Optimistic-concurrency 409 handler (Prompt 1: "409 on stale write with a
 * merge prompt"). Full field-by-field merge UI is more than this scope
 * needs — the two real choices a PM has when someone else edited the same
 * initiative are "take their version" or "my edit still wins, save it
 * anyway" — so that's what this offers, with the server's current values
 * shown for the fields most likely to have changed.
 */
export function ConflictMergeDialog({
  conflict,
  onUseServerVersion,
  onKeepMine,
}: ConflictMergeDialogProps) {
  return (
    <Dialog
      open={!!conflict}
      onOpenChange={(open) => {
        if (!open) onUseServerVersion();
      }}
      title="This initiative changed since you loaded it"
      description="Someone else saved a change while you were editing. Choose which version to keep."
    >
      {conflict && (
        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium text-fg">
              Current saved version (v{conflict.current.version})
            </p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted">
              <dt>Title</dt>
              <dd className="text-fg">{conflict.current.title}</dd>
              <dt>Phase</dt>
              <dd className="text-fg">{conflict.current.phase}</dd>
              <dt>Health</dt>
              <dd className="text-fg">{conflict.current.health}</dd>
            </dl>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onUseServerVersion}>
              Discard my change, use this
            </Button>
            <Button variant="danger" onClick={() => onKeepMine(conflict.current.version)}>
              Keep my change, save anyway
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
