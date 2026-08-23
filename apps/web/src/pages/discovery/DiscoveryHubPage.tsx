import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button, Input, Select, Table, Tabs } from '@pdlc/ui';
import {
  useAllEvidenceItems,
  useCreateEvidenceItem,
  useCreateInsight,
  useCreateOpportunity,
  useCreateSource,
  useInsights,
  useOpportunities,
  useSources,
} from '../../features/discovery/hooks';
import type { Confidence, SourceType } from '../../features/discovery/types';

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
 * cluster it into Insights, promote to an Opportunity — same tabbed-page
 * shape as InitiativeDetailPage, one Table + inline create form per tab.
 * The Opportunity Solution Tree and "promote to initiative" action live on
 * OpportunityDetailPage instead, reached by clicking a row here.
 */
export function DiscoveryHubPage() {
  return (
    <div className="flex flex-col gap-4">
      <header className="border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-fg">Discovery Hub</h1>
        <p className="text-sm text-muted">
          Sources → Evidence → Insights → Opportunities → Initiatives, trail preserved.
        </p>
      </header>

      <Tabs
        aria-label="Discovery Hub sections"
        items={[
          { value: 'sources', label: 'Sources', content: <SourcesTab /> },
          { value: 'evidence', label: 'Evidence', content: <EvidenceTab /> },
          { value: 'insights', label: 'Insights', content: <InsightsTab /> },
          { value: 'opportunities', label: 'Opportunities', content: <OpportunitiesTab /> },
        ]}
      />
    </div>
  );
}

function SourcesTab() {
  const { data: sources } = useSources();
  const create = useCreateSource();
  const [name, setName] = useState('');
  const [type, setType] = useState<SourceType>('INTERVIEW');

  return (
    <div className="flex flex-col gap-4">
      <Table
        caption="Sources"
        rows={sources ?? []}
        getRowId={(r) => r.id}
        emptyMessage="No sources yet."
        columns={[
          { key: 'name', header: 'Name', render: (r) => r.name },
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
          void create.mutateAsync({ type, name }).then(() => setName(''));
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
    </div>
  );
}

function EvidenceTab() {
  const { data: sources } = useSources();
  const [sourceId, setSourceId] = useState<string | undefined>(undefined);
  const activeSourceId = sourceId ?? sources?.[0]?.id;
  const create = useCreateEvidenceItem(activeSourceId ?? '');
  const { items: allEvidence } = useAllEvidenceItems();
  const [content, setContent] = useState('');
  const [capturedBy, setCapturedBy] = useState('');

  const sourceOptions = (sources ?? []).map((s) => ({ value: s.id, label: s.name }));
  const forSource = allEvidence.filter((e) => e.sourceId === activeSourceId);

  if (!sources || sources.length === 0) {
    return <p className="text-sm text-muted">Add a source first, then capture evidence under it.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
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
            .then(() => setContent(''));
        }}
      >
        <Input
          label="Evidence content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
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
    </div>
  );
}

function InsightsTab() {
  const { data } = useInsights({ limit: 200 });
  const create = useCreateInsight();
  const { items: allEvidence } = useAllEvidenceItems();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [confidence, setConfidence] = useState<Confidence>('MEDIUM');
  const [evidenceItemIds, setEvidenceItemIds] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4">
      <Table
        caption="Insights"
        rows={data?.items ?? []}
        getRowId={(r) => r.id}
        emptyMessage="No insights yet."
        columns={[
          { key: 'title', header: 'Title', render: (r) => r.title },
          { key: 'confidence', header: 'Confidence', render: (r) => r.confidence },
          { key: 'evidence', header: 'Evidence linked', render: (r) => r.evidenceItemIds.length },
        ]}
      />
      <form
        className="flex flex-col gap-3 rounded-md border border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void create.mutateAsync({ title, summary, confidence, evidenceItemIds }).then(() => {
            setTitle('');
            setSummary('');
            setEvidenceItemIds([]);
          });
        }}
      >
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
    </div>
  );
}

function OpportunitiesTab() {
  const { data } = useOpportunities({ limit: 200 });
  const { data: insightsData } = useInsights({ limit: 200 });
  const create = useCreateOpportunity();
  const [title, setTitle] = useState('');
  const [problemFraming, setProblemFraming] = useState('');
  const [insightIds, setInsightIds] = useState<string[]>([]);
  const insights = insightsData?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Table
        caption="Opportunities"
        rows={data?.items ?? []}
        getRowId={(r) => r.id}
        emptyMessage="No opportunities yet."
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
            render: (r) => (r.promotedToInitiativeId ? 'Promoted' : 'Not yet promoted'),
          },
        ]}
      />
      <form
        className="flex flex-col gap-3 rounded-md border border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void create.mutateAsync({ title, problemFraming, insightIds }).then(() => {
            setTitle('');
            setProblemFraming('');
            setInsightIds([]);
          });
        }}
      >
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
