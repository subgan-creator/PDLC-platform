import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { HealthStatus, Initiative, InitiativePhase } from '@pdlc/shared-types';
import { Button, Input, Select, Table, Tabs, cn, useToast } from '@pdlc/ui';
import {
  useBulkUpdateInitiatives,
  useInitiatives,
  useProductAreas,
} from '../../features/initiatives/hooks';
import { downloadInitiativesCsv } from '../../features/initiatives/api';
import { useAuth } from '../../auth/auth-context';
import { CreateInitiativeDialog } from '../../features/initiatives/components/CreateInitiativeDialog';
import { HealthBadge, PhaseBadge } from '../../features/initiatives/components/badges';

const PHASES: InitiativePhase[] = ['DISCOVERY', 'DEFINITION', 'BUILD', 'LAUNCH', 'ADOPT', 'DONE'];
const HEALTHS: HealthStatus[] = ['GREEN', 'AMBER', 'RED'];

/**
 * Cursor-paginated (not offset) so this stays responsive at the 2,000-
 * initiative scale target in Prompt 1 — "Load more" appends a page rather
 * than re-fetching everything already on screen.
 */
export function InitiativeListPage() {
  const [view, setView] = useState<'table' | 'board'>('table');
  const [q, setQ] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<InitiativePhase[]>([]);
  const [healthFilter, setHealthFilter] = useState<HealthStatus[]>([]);
  const [productAreaId, setProductAreaId] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([undefined]);
  const { devIdentity } = useAuth();
  const { push } = useToast();

  const cursor = cursorStack[cursorStack.length - 1];
  const params = {
    q: q || undefined,
    phase: phaseFilter.length > 0 ? phaseFilter : undefined,
    health: healthFilter.length > 0 ? healthFilter : undefined,
    productAreaId,
    cursor,
    limit: 50,
  };

  const { data, isLoading } = useInitiatives(params);
  const { data: areas } = useProductAreas();
  const bulkUpdate = useBulkUpdateInitiatives();

  const areaOptions = useMemo(
    () => (areas ?? []).map((a) => ({ value: a.id, label: a.name })),
    [areas],
  );
  const areaNameById = useMemo(() => new Map((areas ?? []).map((a) => [a.id, a.name])), [areas]);

  function togglePhase(p: InitiativePhase) {
    setPhaseFilter((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
    setCursorStack([undefined]);
  }
  function toggleHealth(h: HealthStatus) {
    setHealthFilter((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
    setCursorStack([undefined]);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkPhase(newPhase: string) {
    if (selected.size === 0) return;
    await bulkUpdate.mutateAsync({
      ids: [...selected],
      patch: { phase: newPhase as InitiativePhase },
    });
    setSelected(new Set());
    push({ title: `Updated ${selected.size} initiative(s)`, variant: 'success' });
  }

  async function handleExport() {
    await downloadInitiativesCsv(params, devIdentity ?? undefined);
  }

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg">Initiatives</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void handleExport()}>
            Export CSV
          </Button>
          <CreateInitiativeDialog />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          label="Search"
          placeholder="Title or problem statement…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {areaOptions.length > 0 && (
          <Select
            label="Product area"
            options={areaOptions}
            value={productAreaId}
            onValueChange={setProductAreaId}
            placeholder="All areas"
          />
        )}
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-medium text-fg">Phase</legend>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by phase">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={phaseFilter.includes(p)}
                onClick={() => togglePhase(p)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs font-medium',
                  phaseFilter.includes(p)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-sm font-medium text-fg">Health</legend>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by health">
            {HEALTHS.map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={healthFilter.includes(h)}
                onClick={() => toggleHealth(h)}
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs font-medium',
                  healthFilter.includes(h)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted',
                )}
              >
                {h}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/10 px-3 py-2">
          <span className="text-sm text-fg">{selected.size} selected</span>
          <Select
            label="Set phase"
            options={PHASES.map((p) => ({ value: p, label: p }))}
            onValueChange={(v) => void handleBulkPhase(v)}
            placeholder="Bulk-set phase…"
          />
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <Tabs
        aria-label="Initiative view"
        value={view}
        onValueChange={(v) => setView(v as 'table' | 'board')}
        items={[
          {
            value: 'table',
            label: 'Table',
            content: (
              <Table
                caption="Initiatives"
                rows={items}
                getRowId={(row) => row.id}
                emptyMessage={isLoading ? 'Loading…' : 'No initiatives match these filters.'}
                columns={[
                  {
                    key: 'select',
                    header: 'Select',
                    render: (row: Initiative) => (
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.title}`}
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelected(row.id)}
                      />
                    ),
                  },
                  {
                    key: 'title',
                    header: 'Title',
                    render: (row: Initiative) => (
                      <span className="flex items-center gap-2">
                        <Link
                          to="/initiatives/$initiativeId"
                          params={{ initiativeId: row.id }}
                          className="font-medium text-fg hover:text-primary hover:underline"
                        >
                          {row.title}
                        </Link>
                        {row.sourceOpportunityId && (
                          <span
                            title="Sourced from Discovery Hub"
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                          >
                            Discovery
                          </span>
                        )}
                      </span>
                    ),
                  },
                  {
                    key: 'phase',
                    header: 'Phase',
                    render: (row: Initiative) => <PhaseBadge phase={row.phase} />,
                  },
                  {
                    key: 'health',
                    header: 'Health',
                    render: (row: Initiative) => <HealthBadge health={row.health} />,
                  },
                  {
                    key: 'area',
                    header: 'Area',
                    render: (row: Initiative) =>
                      row.productAreaId ? (areaNameById.get(row.productAreaId) ?? '—') : '—',
                  },
                  {
                    key: 'plannedEnd',
                    header: 'Target date',
                    render: (row: Initiative) =>
                      row.plannedEnd ? new Date(row.plannedEnd).toLocaleDateString() : '—',
                  },
                  {
                    key: 'tshirtSize',
                    header: 'Size',
                    render: (row: Initiative) => row.tshirtSize,
                  },
                ]}
              />
            ),
          },
          {
            value: 'board',
            label: 'Board',
            content: (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {PHASES.map((phase) => (
                  <div
                    key={phase}
                    className="flex flex-col gap-2 rounded-md border border-border p-2"
                  >
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {phase}
                    </h2>
                    {items
                      .filter((i) => i.phase === phase)
                      .map((i) => (
                        <Link
                          key={i.id}
                          to="/initiatives/$initiativeId"
                          params={{ initiativeId: i.id }}
                          className="flex flex-col gap-1 rounded-md border border-border p-2 text-sm hover:border-primary"
                        >
                          <span className="font-medium text-fg">{i.title}</span>
                          <HealthBadge health={i.health} />
                        </Link>
                      ))}
                  </div>
                ))}
              </div>
            ),
          },
        ]}
      />

      <div className="flex justify-center gap-2">
        {cursorStack.length > 1 && (
          <Button variant="secondary" onClick={() => setCursorStack((prev) => prev.slice(0, -1))}>
            Back
          </Button>
        )}
        {data?.nextCursor && (
          <Button
            variant="secondary"
            onClick={() => setCursorStack((prev) => [...prev, data.nextCursor ?? undefined])}
          >
            Load more
          </Button>
        )}
      </div>
    </div>
  );
}
