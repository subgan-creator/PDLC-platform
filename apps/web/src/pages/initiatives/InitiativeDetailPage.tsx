import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import type { Initiative } from '@pdlc/shared-types';
import { Button, Dialog, Input, Select, Table, Tabs, useToast } from '@pdlc/ui';
import { isVersionConflict } from '../../lib/api-client';
import { useOpportunity } from '../../features/discovery/hooks';
import {
  useActivity,
  useAddStakeholder,
  useArchiveInitiative,
  useComments,
  useCreateComment,
  useCreateLink,
  useCreateMilestone,
  useCreateRaidItem,
  useInitiative,
  useLinks,
  useMilestones,
  useRaidItems,
  useStakeholders,
  useStatusUpdates,
  useUpdateInitiative,
  useVersions,
} from '../../features/initiatives/hooks';
import { HealthBadge, PhaseBadge } from '../../features/initiatives/components/badges';
import type { InitiativeWithRelations } from '../../features/initiatives/types';
import { StatusUpdateComposer } from '../../features/initiatives/components/StatusUpdateComposer';
import {
  ConflictMergeDialog,
  type ConflictState,
} from '../../features/initiatives/components/ConflictMergeDialog';

const PHASE_OPTIONS = ['DISCOVERY', 'DEFINITION', 'BUILD', 'LAUNCH', 'ADOPT', 'DONE'].map((v) => ({
  value: v,
  label: v,
}));
const HEALTH_OPTIONS = ['GREEN', 'AMBER', 'RED'].map((v) => ({ value: v, label: v }));
const RACI_OPTIONS = ['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED'].map((v) => ({
  value: v,
  label: v,
}));

export function InitiativeDetailPage() {
  const { initiativeId } = useParams({ from: '/initiatives/$initiativeId' });
  const { data: initiative, isLoading } = useInitiative(initiativeId);
  const update = useUpdateInitiative(initiativeId);
  const archive = useArchiveInitiative(initiativeId);
  const { data: milestones } = useMilestones(initiativeId);
  const { push } = useToast();
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [editingHealthReason, setEditingHealthReason] = useState('');

  if (isLoading || !initiative) {
    return <p className="text-sm text-muted">Loading initiative…</p>;
  }

  const nextMilestone = (milestones ?? [])
    .filter((m) => m.status === 'PLANNED')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  /** Every inline edit goes through this — on a 409 it opens the merge dialog instead of silently failing or overwriting. */
  async function save(patch: Record<string, unknown>) {
    try {
      await update.mutateAsync({ version: initiative!.version, ...patch });
    } catch (err) {
      if (isVersionConflict(err) && err.problem.conflict) {
        setConflict({ current: err.problem.conflict as Initiative, pendingPatch: patch });
      } else {
        push({ title: 'Save failed', description: 'Please try again.', variant: 'danger' });
      }
    }
  }

  async function handleKeepMine(retryVersion: number) {
    if (!conflict) return;
    await update.mutateAsync({ version: retryVersion, ...conflict.pendingPatch });
    setConflict(null);
    push({ title: 'Saved your version', variant: 'success' });
  }

  return (
    <div className="flex flex-col gap-4">
      <ConflictMergeDialog
        conflict={conflict}
        onUseServerVersion={() => setConflict(null)}
        onKeepMine={(v) => void handleKeepMine(v)}
      />

      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="flex items-start justify-between gap-4">
          <input
            className="w-full border-none bg-transparent text-xl font-semibold text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus"
            defaultValue={initiative.title}
            aria-label="Initiative title"
            onBlur={(e) => {
              if (e.target.value !== initiative.title) void save({ title: e.target.value });
            }}
          />
          <ArchiveButton
            onArchive={async () => {
              await archive.mutateAsync(initiative.version);
              push({ title: 'Initiative archived', variant: 'success' });
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PhaseBadge phase={initiative.phase} />
          <HealthBadge health={initiative.health} />
          <span className="text-sm text-muted">Owner: {initiative.ownerId}</span>
          {nextMilestone && (
            <span className="text-sm text-muted">
              Next milestone: {nextMilestone.title} (
              {new Date(nextMilestone.dueDate).toLocaleDateString()})
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            label="Phase"
            options={PHASE_OPTIONS}
            value={initiative.phase}
            onValueChange={(v) => void save({ phase: v })}
          />
          <Select
            label="Health"
            options={HEALTH_OPTIONS}
            value={initiative.health}
            onValueChange={(v) => {
              if (v === 'GREEN') void save({ health: v, healthReason: null });
              else setEditingHealthReason(initiative.healthReason ?? '');
            }}
          />
          {editingHealthReason !== '' && (
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void save({
                  health: initiative.health === 'GREEN' ? 'AMBER' : initiative.health,
                  healthReason: editingHealthReason,
                });
                setEditingHealthReason('');
              }}
            >
              <Input
                label="Reason (required for non-green health)"
                value={editingHealthReason}
                onChange={(e) => setEditingHealthReason(e.target.value)}
                required
              />
              <Button type="submit" size="sm">
                Save
              </Button>
            </form>
          )}
        </div>
      </header>

      <Tabs
        aria-label="Initiative sections"
        items={[
          {
            value: 'overview',
            label: 'Overview',
            content: <OverviewTab initiative={initiative} onSave={save} />,
          },
          {
            value: 'outcomes',
            label: 'Outcomes',
            content: <OutcomesTab initiative={initiative} />,
          },
          { value: 'raid', label: 'RAID', content: <RaidTab initiativeId={initiativeId} /> },
          {
            value: 'milestones',
            label: 'Milestones',
            content: <MilestonesTab initiativeId={initiativeId} />,
          },
          {
            value: 'stakeholders',
            label: 'Stakeholders',
            content: <StakeholdersTab initiativeId={initiativeId} />,
          },
          {
            value: 'updates',
            label: 'Updates',
            content: (
              <div className="flex flex-col gap-4">
                <StatusUpdateComposer initiativeId={initiativeId} />
                <StatusUpdatesList initiativeId={initiativeId} />
              </div>
            ),
          },
          { value: 'links', label: 'Links', content: <LinksTab initiativeId={initiativeId} /> },
          {
            value: 'comments',
            label: 'Comments',
            content: <CommentsTab initiativeId={initiativeId} />,
          },
          {
            value: 'activity',
            label: 'Activity',
            content: <ActivityTab initiativeId={initiativeId} />,
          },
          {
            value: 'history',
            label: 'History',
            content: <VersionsTab initiativeId={initiativeId} />,
          },
        ]}
      />
    </div>
  );
}

function ArchiveButton({ onArchive }: { onArchive: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Archive this initiative?"
      description="It will be hidden from the default list view. This can be reversed by an admin."
      trigger={
        <Button variant="danger" size="sm">
          Archive
        </Button>
      }
    >
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            void onArchive().then(() => setOpen(false));
          }}
        >
          Archive
        </Button>
      </div>
    </Dialog>
  );
}

function OverviewTab({
  initiative,
  onSave,
}: {
  initiative: InitiativeWithRelations;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {initiative.sourceOpportunityId && <OriginTrail opportunityId={initiative.sourceOpportunityId} />}
      <EditableTextArea
        label="Problem statement"
        value={initiative.problemStatement}
        onSave={(v) => onSave({ problemStatement: v })}
      />
      <EditableTextArea
        label="Scope"
        value={initiative.scope}
        onSave={(v) => onSave({ scope: v })}
      />
      <EditableTextArea
        label="Non-scope"
        value={initiative.nonScope}
        onSave={(v) => onSave({ nonScope: v })}
      />
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <dt className="text-muted">Confidence</dt>
        <dd className="text-fg">{initiative.confidence}</dd>
        <dt className="text-muted">Size</dt>
        <dd className="text-fg">{initiative.tshirtSize}</dd>
        <dt className="text-muted">Planned start</dt>
        <dd className="text-fg">
          {initiative.plannedStart ? new Date(initiative.plannedStart).toLocaleDateString() : '—'}
        </dd>
        <dt className="text-muted">Planned end</dt>
        <dd className="text-fg">
          {initiative.plannedEnd ? new Date(initiative.plannedEnd).toLocaleDateString() : '—'}
        </dd>
        <dt className="text-muted">Tags</dt>
        <dd className="text-fg">{initiative.tags.join(', ') || '—'}</dd>
        <dt className="text-muted">Teams</dt>
        <dd className="text-fg">{initiative.contributingTeams.join(', ') || '—'}</dd>
      </dl>
    </div>
  );
}

function EditableTextArea({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-fg">{label}</label>
      <textarea
        className="min-h-20 rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg focus-visible:outline-none"
        defaultValue={value}
        onBlur={(e) => {
          if (e.target.value !== value) void onSave(e.target.value);
        }}
      />
    </div>
  );
}

/**
 * The "why are we doing this" trail from Discovery Hub (Phase 2, JTBD 1) —
 * only rendered when Initiative.sourceOpportunityId is set (i.e. this
 * initiative was created via the Opportunity promote flow, not a plain
 * "New initiative").
 */
function OriginTrail({ opportunityId }: { opportunityId: string }) {
  const { data: opportunity } = useOpportunity(opportunityId);
  if (!opportunity) return null;
  return (
    <p className="rounded-md border border-border bg-muted/5 px-3 py-2 text-sm text-fg">
      Promoted from Opportunity:{' '}
      <Link
        to="/discovery/opportunities/$opportunityId"
        params={{ opportunityId }}
        className="text-primary hover:underline"
      >
        {opportunity.title}
      </Link>
    </p>
  );
}

function OutcomesTab({ initiative }: { initiative: InitiativeWithRelations }) {
  return (
    <Table
      caption="Outcome metrics"
      rows={initiative.outcomeMetrics}
      getRowId={(r) => r.id}
      emptyMessage="No outcome metrics yet."
      columns={[
        { key: 'metric', header: 'Metric', render: (r) => r.metricName },
        { key: 'baseline', header: 'Baseline', render: (r) => r.baseline ?? '—' },
        { key: 'current', header: 'Current', render: (r) => r.current ?? '—' },
        { key: 'target', header: 'Target', render: (r) => r.target },
        { key: 'unit', header: 'Unit', render: (r) => r.unit },
      ]}
    />
  );
}

function RaidTab({ initiativeId }: { initiativeId: string }) {
  const { data: items } = useRaidItems(initiativeId);
  const create = useCreateRaidItem(initiativeId);
  const [type, setType] = useState('RISK');
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <Table
        caption="RAID log"
        rows={items ?? []}
        getRowId={(r) => r.id}
        emptyMessage="No RAID items yet."
        columns={[
          { key: 'type', header: 'Type', render: (r) => r.type },
          { key: 'severity', header: 'Severity', render: (r) => r.severity },
          { key: 'description', header: 'Description', render: (r) => r.description },
          { key: 'status', header: 'Status', render: (r) => r.status },
        ]}
      />
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void create
            .mutateAsync({
              type: type as never,
              severity: severity as never,
              description,
              ownerId: null,
              dueDate: null,
              mitigation: null,
              status: 'OPEN',
            })
            .then(() => setDescription(''));
        }}
      >
        <Select
          label="Type"
          options={['RISK', 'ASSUMPTION', 'ISSUE', 'DEPENDENCY'].map((v) => ({
            value: v,
            label: v,
          }))}
          value={type}
          onValueChange={setType}
        />
        <Select
          label="Severity"
          options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((v) => ({ value: v, label: v }))}
          value={severity}
          onValueChange={setSeverity}
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <Button type="submit" disabled={create.isPending}>
          Add
        </Button>
      </form>
    </div>
  );
}

function MilestonesTab({ initiativeId }: { initiativeId: string }) {
  const { data: milestones } = useMilestones(initiativeId);
  const create = useCreateMilestone(initiativeId);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <Table
        caption="Milestones"
        rows={milestones ?? []}
        getRowId={(r) => r.id}
        emptyMessage="No milestones yet."
        columns={[
          { key: 'title', header: 'Title', render: (r) => r.title },
          {
            key: 'dueDate',
            header: 'Due',
            render: (r) => new Date(r.dueDate).toLocaleDateString(),
          },
          { key: 'status', header: 'Status', render: (r) => r.status },
        ]}
      />
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!dueDate) return;
          void create
            .mutateAsync({
              title,
              dueDate: new Date(dueDate).toISOString(),
              status: 'PLANNED',
              description: null,
            })
            .then(() => setTitle(''));
        }}
      >
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input
          label="Due date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
        />
        <Button type="submit" disabled={create.isPending}>
          Add milestone
        </Button>
      </form>
    </div>
  );
}

function StakeholdersTab({ initiativeId }: { initiativeId: string }) {
  const { data: stakeholders } = useStakeholders(initiativeId);
  const add = useAddStakeholder(initiativeId);
  const [userId, setUserId] = useState('');
  const [raciRole, setRaciRole] = useState('RESPONSIBLE');

  return (
    <div className="flex flex-col gap-4">
      <Table
        caption="Stakeholders"
        rows={stakeholders ?? []}
        getRowId={(r) => `${r.userId}-${r.raciRole}`}
        emptyMessage="No stakeholders added yet."
        columns={[
          { key: 'userId', header: 'User ID', render: (r) => r.userId },
          { key: 'raciRole', header: 'RACI role', render: (r) => r.raciRole },
        ]}
      />
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void add.mutateAsync({ userId, raciRole: raciRole as never }).then(() => setUserId(''));
        }}
      >
        <Input
          label="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
          hint="Paste a user id from the seed output."
        />
        <Select
          label="RACI role"
          options={RACI_OPTIONS}
          value={raciRole}
          onValueChange={setRaciRole}
        />
        <Button type="submit" disabled={add.isPending}>
          Add
        </Button>
      </form>
    </div>
  );
}

function StatusUpdatesList({ initiativeId }: { initiativeId: string }) {
  const { data: updates } = useStatusUpdates(initiativeId);
  return (
    <ul className="flex flex-col gap-3">
      {(updates ?? []).map((u) => (
        <li key={u.id} className="rounded-md border border-border p-3 text-sm">
          <div className="flex items-center gap-2">
            <HealthBadge health={u.healthAtTimeOfUpdate} />
            <span className="text-muted">{new Date(u.createdAt).toLocaleString()}</span>
          </div>
          <p className="mt-1 text-fg">{u.progress}</p>
        </li>
      ))}
      {(updates ?? []).length === 0 && <p className="text-sm text-muted">No status updates yet.</p>}
    </ul>
  );
}

function LinksTab({ initiativeId }: { initiativeId: string }) {
  const { data: links } = useLinks(initiativeId);
  const create = useCreateLink(initiativeId);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {(links ?? []).map((l) => (
          <li key={l.id} className="text-sm">
            <a
              href={l.url ?? '#'}
              className="text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {l.label}
            </a>
          </li>
        ))}
        {(links ?? []).length === 0 && <p className="text-sm text-muted">No links yet.</p>}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void create
            .mutateAsync({ targetType: 'EXTERNAL_URL', targetId: null, url, label })
            .then(() => {
              setLabel('');
              setUrl('');
            });
        }}
      >
        <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} required />
        <Input label="URL" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <Button type="submit" disabled={create.isPending}>
          Add link
        </Button>
      </form>
    </div>
  );
}

function CommentsTab({ initiativeId }: { initiativeId: string }) {
  const { data: comments } = useComments(initiativeId);
  const create = useCreateComment(initiativeId);
  const [body, setBody] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {(comments ?? []).map((c) => (
          <li key={c.id} className="rounded-md border border-border p-3 text-sm">
            <span className="text-muted">{new Date(c.createdAt).toLocaleString()}</span>
            <p className="text-fg">{c.body}</p>
          </li>
        ))}
        {(comments ?? []).length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
      </ul>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void create.mutateAsync({ body, parentCommentId: null }).then(() => setBody(''));
        }}
      >
        <Input
          label="Add a comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <Button type="submit" disabled={create.isPending}>
          Post
        </Button>
      </form>
    </div>
  );
}

function ActivityTab({ initiativeId }: { initiativeId: string }) {
  const { data: activity } = useActivity(initiativeId);
  return (
    <ul className="flex flex-col gap-2">
      {(activity ?? []).map((a) => (
        <li key={a.id} className="flex items-center gap-2 text-sm">
          <span className="text-muted">{new Date(a.occurredAt).toLocaleString()}</span>
          <span className="text-fg">{a.action}</span>
        </li>
      ))}
      {(activity ?? []).length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
    </ul>
  );
}

function VersionsTab({ initiativeId }: { initiativeId: string }) {
  const { data: versions } = useVersions(initiativeId);
  return (
    <ul className="flex flex-col gap-2">
      {(versions ?? []).map((v) => (
        <li key={v.id} className="flex items-center gap-2 text-sm">
          <span className="font-medium text-fg">v{v.version}</span>
          <span className="text-muted">{new Date(v.changedAt).toLocaleString()}</span>
          <span className="text-muted">{v.changeSummary ?? 'Edited'}</span>
        </li>
      ))}
      {(versions ?? []).length === 0 && (
        <p className="text-sm text-muted">No version history yet.</p>
      )}
    </ul>
  );
}
