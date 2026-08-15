import { useState } from 'react';
import type { HealthStatus } from '@pdlc/shared-types';
import { Button, Select, useToast } from '@pdlc/ui';
import { useCreateStatusUpdate } from '../hooks';

const HEALTH_OPTIONS = [
  { value: 'GREEN', label: 'Green — on track' },
  { value: 'AMBER', label: 'Amber — at risk' },
  { value: 'RED', label: 'Red — off track' },
];

/**
 * Structured update: progress / next / risks / asks — the exact shape the
 * Reporting Studio (Phase 8) will read as its input. Auto-drafting this
 * from the last two weeks of activity is a Phase 9 (AI Assist) concern;
 * `draftedFromActivity` on the record is the seam for it — this composer
 * only ever writes a human-authored update.
 */
export function StatusUpdateComposer({ initiativeId }: { initiativeId: string }) {
  const [health, setHealth] = useState<HealthStatus>('GREEN');
  const [progress, setProgress] = useState('');
  const [next, setNext] = useState('');
  const [risks, setRisks] = useState('');
  const [asks, setAsks] = useState('');
  const create = useCreateStatusUpdate(initiativeId);
  const { push } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    await create.mutateAsync({
      periodStart: twoWeeksAgo.toISOString(),
      periodEnd: now.toISOString(),
      progress,
      next,
      risks,
      asks,
      healthAtTimeOfUpdate: health,
    });
    setProgress('');
    setNext('');
    setRisks('');
    setAsks('');
    push({ title: 'Status update posted', variant: 'success' });
  }

  const field = (id: string, label: string, value: string, onChange: (v: string) => void) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <textarea
        id={id}
        className="min-h-16 rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus-visible:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-border p-4"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <h3 className="text-sm font-semibold text-fg">Post a status update</h3>
      <Select
        label="Health"
        options={HEALTH_OPTIONS}
        value={health}
        onValueChange={(v) => setHealth(v as HealthStatus)}
      />
      {field('progress', 'Progress', progress, setProgress)}
      {field('next', 'Next', next, setNext)}
      {field('risks', 'Risks', risks, setRisks)}
      {field('asks', 'Asks', asks, setAsks)}
      <div className="flex justify-end">
        <Button type="submit" disabled={create.isPending || !progress}>
          {create.isPending ? 'Posting…' : 'Post update'}
        </Button>
      </div>
    </form>
  );
}
