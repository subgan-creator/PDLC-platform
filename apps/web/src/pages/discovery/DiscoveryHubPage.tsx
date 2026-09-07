import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Dialog, Input, Select, Table, Tabs, useToast } from '@pdlc/ui';
import {
  useAllEvidenceItems,
  useCreateEvidenceItem,
  useCreateInsight,
  useCreateOpportunity,
  useCreateSource,
  useInsights,
  useOpportunities,
  useSources,
  useUpdateSource,
} from '../../features/discovery/hooks';
import { reportMutationError } from '../../features/discovery/report-mutation-error';
import type { Confidence, Source, SourceType } from '../../features/discovery/types';

const SOURCE_TYPE_OPTIONS: Array<{ value: SourceType; label: string }> = [
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'SUPPORT_TICKET', label: 'Support ticket' },
  { value: 'SURVEY', label: 'Survey' },
  { value: 'COMPETITIVE', label: 'Competitive' },
  { value: 'DATA_FINDING', label: 'Data finding' },
  { value: 'SALES_CALL', label: 'Sales call' },
  { value: 'OTHER', label: 'Other' },
];

const CONFIDENCE_OPTIONS: Array<{ value: Confidence; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

/**
 * Discovery Hub (Phase 2, JTBD 1): capture raw signal (Sources -> Evidence),
 * cluster it into Insights, promote to an Opportunity. Tab state is lifted
 * here (controlled Tabs, not the default uncontrolled usage elsewhere) so
 * a "next step" button in one tab can jump the user into the next —
 * added after user feedback that four independent CRUD tabs didn't read
 * as a workflow. Each tab also carries a one-line "what is this for /
 * what do I do next" strip for the same reason.
 */
export function DiscoveryHubPage() {
  const [tab, setTab] = useState('sources');

  return (
    <div className="flex flex-col gap-4">
      <header className="border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-fg">Discovery Hub</h1>
        <p className="text-sm text-muted">
          Capture signal, cluster it into insights, and promote what&rsquo;s worth acting on into an
          initiative — trail preserved end to end.
        </p>
      </header>

      {/* variant="stepper" — user feedback was that plain text tabs didn't
          read as a connected workflow. Steps stay freely clickable in
          either direction (not a locked wizard); see Tabs.tsx for why. */}
      <Tabs
        aria-label="Discovery Hub sections"
        variant="stepper"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'sources', label: 'Sources', content: <SourcesTab /> },
          { value: 'evidence', label: 'Evidence', content: <EvidenceTab onDone={() => setTab('insights')} /> },
          { value: 'insights', label: 'Insights', content: <InsightsTab onPromoted={() => setTab('opportunities')} /> },
          { value: 'opportunities', label: 'Opportunities', content: <OpportunitiesTab /> },
        ]}
      />
    </div>
  );
}

function SourcesTab() {
  const { data: sources } = useSources();
  const create = useCreateSource();
  const { push } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<SourceType>('INTERVIEW');
  const [editing, setEditing] = useState<Source | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        A Source is where raw customer signal comes from — internal (a support ticket export, a
        sales call) or external (an interview, a survey, competitive research). Add one, then{' '}
        <strong className="text-fg">click it</strong> to see its details and capture Evidence
        under it.
      </p>
      <Table
        caption="Sources"
        rows={sources ?? []}
        getRowId={(r) => r.id}
        emptyMessage="No sources yet."
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (r) => (
              <button
                type="button"
                className="text-left font-medium text-primary hover:underline"
                onClick={() => setEditing(r)}
              >
                {r.name}
              </button>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (r) => SOURCE_TYPE_OPTIONS.find((o) => o.value === r.type)?.label ?? r.type,
          },
          {
            key: 'createdAt',
            header: 'Added',
            render: (r) => new Date(r.createdAt).toLocaleDateString(),
          },
        ]}
      />
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void create
            .mutateAsync({ type, name })
            .then(() => setName(''))
            .catch(reportMutationError(push, 'Could not add source'));
        }}
      >
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Select
          label="Type"
          options={SOURCE_TYPE_OPTIONS}
          value={type}
          onValueChange={(v) => setType(v as SourceType)}
        />
        <Button type="submit" disabled={create.isPending || !name}>
          Add source
        </Button>
      </form>

      {/* key forces a remount (so local state re-seeds) whenever a
          different source is opened, or the dialog closes back to none. */}
      <EditSourceDialog key={editing?.id ?? 'none'} source={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function EditSourceDialog({ source, onClose }: { source: Source | null; onClose: () => void }) {
  const update = useUpdateSource();
  const { push } = useToast();
  const [name, setName] = useState(source?.name ?? '');
  const [type, setType] = useState<SourceType>(source?.type ?? 'INTERVIEW');
  const [externalRef, setExternalRef] = useState(source?.externalRef ?? '');

  return (
    <Dialog
      open={!!source}
      onOpenChange={(open) => !open && onClose()}
      title={source ? `Source: ${source.name}` : 'Source'}
      description="Internal sources (tickets, sales calls) and external ones (interviews, surveys, competitive research) both live here — this is the source's own record."
    >
      {source && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void update
              .mutateAsync({ id: source.id, input: { name, type, externalRef: externalRef || null } })
              .then(onClose)
              .catch(reportMutationError(push, 'Could not save source'));
          }}
        >
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Select
            label="Type"
            options={SOURCE_TYPE_OPTIONS}
            value={type}
            onValueChange={(v) => setType(v as SourceType)}
          />
          <Input
            label="External reference"
            value={externalRef}
            onChange={(e) => setExternalRef(e.target.value)}
            hint="Optional — a ticket number, survey link, or connector id."
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={update.isPending}>
              Save
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function EvidenceTab({ onDone }: { onDone: () => void }) {
  const { data: sources } = useSources();
  const [sourceId, setSourceId] = useState<string | undefined>(undefined);
  const activeSourceId = sourceId ?? sources?.[0]?.id;
  const create = useCreateEvidenceItem(activeSourceId ?? '');
  const { items: allEvidence } = useAllEvidenceItems();
  const { push } = useToast();
  const [content, setContent] = useState('');
  const [capturedBy, setCapturedBy] = useState('');

  const sourceOptions = (sources ?? []).map((s) => ({ value: s.id, label: s.name }));
  const forSource = allEvidence.filter((e) => e.sourceId === activeSourceId);

  if (!sources || sources.length === 0) {
    return (
      <p className="text-sm text-muted">
        Add a source on the previous tab first, then come back here to capture evidence under it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Evidence is one specific quote, ticket, or data point you noticed — not a summary. Capture
        it raw here; you&rsquo;ll look for patterns across several pieces of evidence next, on the
        Insights tab.
      </p>
      <Select
        label="Source"
        options={sourceOptions}
        value={activeSourceId}
        onValueChange={setSourceId}
      />
      <Table
        caption="Evidence"
        rows={forSource}
        getRowId={(r) => r.id}
        emptyMessage="No evidence captured for this source yet."
        columns={[
          { key: 'content', header: 'Content', render: (r) => r.content },
          {
            key: 'capturedAt',
            header: 'Captured',
            render: (r) => new Date(r.capturedAt).toLocaleDateString(),
          },
          { key: 'tags', header: 'Tags', render: (r) => r.tags.join(', ') || '—' },
        ]}
      />
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!activeSourceId) return;
          void create
            .mutateAsync({
              content,
              capturedBy,
              capturedAt: new Date().toISOString(),
            })
            .then(() => setContent(''))
            .catch(reportMutationError(push, 'Could not add evidence'));
        }}
      >
        <Input
          label="What did you see or hear?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          hint="e.g. a direct quote, or a one-line description of a data point."
        />
        <Input
          label="Captured by (user id)"
          value={capturedBy}
          onChange={(e) => setCapturedBy(e.target.value)}
          required
          hint="Paste a user id from the seed output."
        />
        <Button type="submit" disabled={create.isPending || !content || !capturedBy}>
          Add evidence
        </Button>
      </form>
      {allEvidence.length > 0 && (
        <div>
          <Button type="button" variant="secondary" onClick={onDone}>
            Ready — go cluster this into an Insight →
          </Button>
        </div>
      )}
    </div>
  );
}

function InsightsTab({ onPromoted }: { onPromoted: () => void }) {
  const { data } = useInsights({ limit: 200 });
  const create = useCreateInsight();
  const createOpportunity = useCreateOpportunity();
  const { items: allEvidence } = useAllEvidenceItems();
  const { push } = useToast();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('MEDIUM');
  const [evidenceItemIds, setEvidenceItemIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [oppTitle, setOppTitle] = useState('');
  const [oppFraming, setOppFraming] = useState('');

  const insights = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        An Insight is a pattern you&rsquo;re noticing across evidence — not a single data point,
        but the theme it points to. Select the evidence backing it below. When you have one or
        more insights worth acting on, check them off and promote them into an Opportunity.
      </p>
      <Table
        caption="Insights"
        rows={insights}
        getRowId={(r) => r.id}
        emptyMessage="No insights yet."
        columns={[
          {
            key: 'select',
            header: 'Select',
            render: (r) => (
              <input
                type="checkbox"
                aria-label={`Select ${r.title}`}
                checked={selected.has(r.id)}
                onChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(r.id)) next.delete(r.id);
                    else next.add(r.id);
                    return next;
                  })
                }
              />
            ),
          },
          { key: 'title', header: 'Title', render: (r) => r.title },
          { key: 'confidence', header: 'Confidence', render: (r) => r.confidence },
          { key: 'evidence', header: 'Evidence linked', render: (r) => r.evidenceItemIds.length },
        ]}
      />
      {selected.size > 0 && (
        <div>
          <Button type="button" onClick={() => setPromoteOpen(true)}>
            Promote {selected.size} selected to an Opportunity →
          </Button>
        </div>
      )}

      <form
        className="flex flex-col gap-3 rounded-md border border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void create
            .mutateAsync({ title, summary, confidence, evidenceItemIds })
            .then(() => {
              setTitle('');
              setSummary('');
              setEvidenceItemIds([]);
            })
            .catch(reportMutationError(push, 'Could not add insight'));
        }}
      >
        <p className="text-sm font-medium text-fg">Add a new insight</p>
        <div className="flex flex-wrap items-end gap-2">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Select
            label="Confidence"
            options={CONFIDENCE_OPTIONS}
            value={confidence}
            onValueChange={(v) => setConfidence(v as Confidence)}
          />
        </div>
        <Input
          label="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
        />
        {allEvidence.length > 0 && (
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium text-fg">Evidence supporting this insight</legend>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {allEvidence.map((e) => (
                <label key={e.id} className="flex items-start gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={evidenceItemIds.includes(e.id)}
                    onChange={(ev) =>
                      setEvidenceItemIds((prev) =>
                        ev.target.checked ? [...prev, e.id] : prev.filter((id) => id !== e.id),
                      )
                    }
                  />
                  {e.content}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div>
          <Button type="submit" disabled={create.isPending || !title || !summary}>
            Add insight
          </Button>
        </div>
      </form>

      <Dialog
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        title="Promote to an opportunity"
        description="Frame the problem worth solving, grounded in the insights you selected."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void createOpportunity
              .mutateAsync({
                title: oppTitle,
                problemFraming: oppFraming,
                insightIds: [...selected],
              })
              .then(() => {
                setPromoteOpen(false);
                setSelected(new Set());
                setOppTitle('');
                setOppFraming('');
                onPromoted();
              })
              .catch(reportMutationError(push, 'Could not promote to an opportunity'));
          }}
        >
          <Input label="Title" value={oppTitle} onChange={(e) => setOppTitle(e.target.value)} required autoFocus />
          <Input
            label="Problem framing"
            value={oppFraming}
            onChange={(e) => setOppFraming(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPromoteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createOpportunity.isPending || !oppTitle || !oppFraming}>
              Promote
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function OpportunitiesTab() {
  const { data } = useOpportunities({ limit: 200 });
  const { data: insightsData } = useInsights({ limit: 200 });
  const create = useCreateOpportunity();
  const { push } = useToast();
  const [title, setTitle] = useState('');
  const [problemFraming, setProblemFraming] = useState('');
  const [insightIds, setInsightIds] = useState<string[]>([]);
  const insights = insightsData?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        An Opportunity frames a problem worth solving. Click one to explore solutions on its
        Opportunity Solution Tree, and promote it into a real initiative when you&rsquo;re ready to
        commit to it.
      </p>
      <Table
        caption="Opportunities"
        rows={data?.items ?? []}
        getRowId={(r) => r.id}
        emptyMessage="No opportunities yet — select some insights on the previous tab and promote them."
        columns={[
          {
            key: 'title',
            header: 'Title',
            render: (r) => (
              <Link
                to="/discovery/opportunities/$opportunityId"
                params={{ opportunityId: r.id }}
                className="text-primary hover:underline"
              >
                {r.title}
              </Link>
            ),
          },
          { key: 'insights', header: 'Insights linked', render: (r) => r.insightIds.length },
          {
            key: 'status',
            header: 'Status',
            render: (r) =>
              r.promotedToInitiativeId ? (
                <Link
                  to="/initiatives/$initiativeId"
                  params={{ initiativeId: r.promotedToInitiativeId }}
                  className="text-primary hover:underline"
                >
                  View initiative →
                </Link>
              ) : (
                <span className="text-muted">Not yet promoted</span>
              ),
          },
        ]}
      />
      <form
        className="flex flex-col gap-3 rounded-md border border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void create
            .mutateAsync({ title, problemFraming, insightIds })
            .then(() => {
              setTitle('');
              setProblemFraming('');
              setInsightIds([]);
            })
            .catch(reportMutationError(push, 'Could not add opportunity'));
        }}
      >
        <p className="text-sm font-medium text-fg">
          Add a new opportunity directly (or promote insights from the previous tab instead)
        </p>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input
          label="Problem framing"
          value={problemFraming}
          onChange={(e) => setProblemFraming(e.target.value)}
          required
        />
        {insights.length > 0 && (
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-medium text-fg">Insights behind this opportunity</legend>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
              {insights.map((i) => (
                <label key={i.id} className="flex items-start gap-2 text-sm text-fg">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={insightIds.includes(i.id)}
                    onChange={(ev) =>
                      setInsightIds((prev) =>
                        ev.target.checked ? [...prev, i.id] : prev.filter((id) => id !== i.id),
                      )
                    }
                  />
                  {i.title}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div>
          <Button type="submit" disabled={create.isPending || !title || !problemFraming}>
            Add opportunity
          </Button>
        </div>
      </form>
    </div>
  );
}
