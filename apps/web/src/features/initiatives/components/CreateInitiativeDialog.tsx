import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Dialog, Input, Select } from '@pdlc/ui';
import { useAuth } from '../../../auth/auth-context';
import { useCreateInitiative, useProductAreas } from '../hooks';

const PHASE_OPTIONS = [
  { value: 'DISCOVERY', label: 'Discovery' },
  { value: 'DEFINITION', label: 'Definition' },
  { value: 'BUILD', label: 'Build' },
  { value: 'LAUNCH', label: 'Launch' },
  { value: 'ADOPT', label: 'Adopt' },
  { value: 'DONE', label: 'Done' },
];

export function CreateInitiativeDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [phase, setPhase] = useState('DISCOVERY');
  const [productAreaId, setProductAreaId] = useState<string | undefined>(undefined);
  const { devIdentity } = useAuth();
  const { data: areas } = useProductAreas();
  const create = useCreateInitiative();
  const navigate = useNavigate();

  const areaOptions = (areas ?? []).map((a) => ({ value: a.id, label: a.name }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!devIdentity) return;
    const initiative = await create.mutateAsync({
      title,
      problemStatement,
      phase: phase as never,
      ownerId: devIdentity.userId,
      productAreaId: productAreaId ?? null,
    });
    setOpen(false);
    setTitle('');
    setProblemStatement('');
    void navigate({ to: '/initiatives/$initiativeId', params: { initiativeId: initiative.id } });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="New initiative"
      description="You'll be the owner — reassign it from the detail page any time."
      trigger={<Button>New initiative</Button>}
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-fg" htmlFor="problem-statement">
            Problem statement
          </label>
          <textarea
            id="problem-statement"
            className="min-h-24 rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus-visible:outline-none"
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            required
          />
        </div>
        <Select label="Phase" options={PHASE_OPTIONS} value={phase} onValueChange={setPhase} />
        {areaOptions.length > 0 && (
          <Select
            label="Product area"
            options={areaOptions}
            value={productAreaId}
            onValueChange={setProductAreaId}
            placeholder="Unassigned"
          />
        )}
        {create.isError && (
          <p role="alert" className="text-sm text-danger">
            Couldn&rsquo;t create the initiative. Check the fields and try again.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending || !title || !problemStatement}>
            {create.isPending ? 'Creating…' : 'Create initiative'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
