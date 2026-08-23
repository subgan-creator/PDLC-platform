import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import ReactFlow, { Background, type Edge, type Node } from 'reactflow';
import 'reactflow/dist/style.css';
import { Button, Dialog, Input, Select, useToast } from '@pdlc/ui';
import { useAuth } from '../../auth/auth-context';
import {
  useCreateSolutionTreeNode,
  useInsights,
  useOpportunity,
  usePromoteOpportunity,
  useSolutionTreeNodes,
} from '../../features/discovery/hooks';
import type { SolutionTreeNodeType } from '../../features/discovery/types';

const NODE_TYPE_OPTIONS: Array<{ value: SolutionTreeNodeType; label: string }> = [
  { value: 'OUTCOME', label: 'Outcome' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'SOLUTION', label: 'Solution' },
  { value: 'EXPERIMENT', label: 'Experiment' },
];

// Design-token-ish colors matching packages/ui/src/styles/tokens.css'
// spirit without importing Tailwind classes into inline React Flow node
// styles (React Flow positions nodes via absolute inline styles, so
// Tailwind utility classes don't apply the same way here).
const NODE_TYPE_COLORS: Record<SolutionTreeNodeType, { bg: string; border: string }> = {
  OUTCOME: { bg: '#eef2ff', border: '#6366f1' },
  OPPORTUNITY: { bg: '#ecfdf5', border: '#10b981' },
  SOLUTION: { bg: '#fffbeb', border: '#f59e0b' },
  EXPERIMENT: { bg: '#fdf2f8', border: '#ec4899' },
};

/**
 * Simple level-order tree layout — BFS from roots (parentNodeId === null),
 * one row per depth, nodes spread evenly across that row. Trees here are
 * small (a handful of nodes, 2-3 levels — see prisma/seed.ts) so this
 * doesn't need a real layout algorithm (dagre/elk aren't installed; this
 * is the first real reactflow usage in the app, see CLAUDE.md tech stack —
 * no existing pattern to extend).
 */
function layoutTree(nodes: Array<{ id: string; parentNodeId: string | null }>): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const childrenByParent = new Map<string | null, string[]>();
  for (const n of nodes) {
    const list = childrenByParent.get(n.parentNodeId) ?? [];
    list.push(n.id);
    childrenByParent.set(n.parentNodeId, list);
  }

  let level = childrenByParent.get(null) ?? [];
  let depth = 0;
  while (level.length > 0) {
    const width = 220;
    const totalWidth = level.length * width;
    level.forEach((id, i) => {
      positions.set(id, { x: i * width - totalWidth / 2 + width / 2, y: depth * 140 });
    });
    depth += 1;
    level = level.flatMap((id) => childrenByParent.get(id) ?? []);
  }
  return positions;
}

export function OpportunityDetailPage() {
  const { opportunityId } = useParams({ from: '/discovery/opportunities/$opportunityId' });
  const { data: opportunity, isLoading } = useOpportunity(opportunityId);
  const { data: treeNodes } = useSolutionTreeNodes(opportunityId);
  const { data: insightsData } = useInsights({ limit: 200 });
  const { push } = useToast();

  if (isLoading || !opportunity) {
    return <p className="text-sm text-muted">Loading opportunity…</p>;
  }

  const linkedInsights = (insightsData?.items ?? []).filter((i) =>
    opportunity.insightIds.includes(i.id),
  );

  const positions = layoutTree(treeNodes ?? []);
  const rfNodes: Node[] = (treeNodes ?? []).map((n) => ({
    id: n.id,
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: { label: `${n.nodeType}: ${n.label}` },
    style: {
      background: NODE_TYPE_COLORS[n.nodeType].bg,
      border: `2px solid ${NODE_TYPE_COLORS[n.nodeType].border}`,
      borderRadius: 8,
      padding: 8,
      fontSize: 12,
      width: 200,
    },
  }));
  const rfEdges: Edge[] = (treeNodes ?? [])
    .filter((n) => n.parentNodeId)
    .map((n) => ({
      id: `${n.parentNodeId}-${n.id}`,
      source: n.parentNodeId as string,
      target: n.id,
    }));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold text-fg">{opportunity.title}</h1>
          {opportunity.promotedToInitiativeId ? (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              Promoted
            </span>
          ) : (
            <PromoteDialog opportunityId={opportunityId} onPromoted={() => push({ title: 'Promoted to a new initiative', variant: 'success' })} />
          )}
        </div>
        <p className="max-w-2xl text-sm text-fg">{opportunity.problemFraming}</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-fg">Insights behind this opportunity</h2>
        <ul className="flex flex-col gap-1">
          {linkedInsights.map((i) => (
            <li key={i.id} className="text-sm text-fg">
              {i.title}
            </li>
          ))}
          {linkedInsights.length === 0 && (
            <p className="text-sm text-muted">No insights linked yet.</p>
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-fg">Opportunity Solution Tree</h2>
        <div className="h-96 rounded-md border border-border" role="img" aria-label="Opportunity solution tree diagram">
          <ReactFlow nodes={rfNodes} edges={rfEdges} fitView proOptions={{ hideAttribution: true }}>
            <Background />
          </ReactFlow>
        </div>
        <AddNodeForm opportunityId={opportunityId} nodes={treeNodes ?? []} />
      </section>
    </div>
  );
}

function PromoteDialog({
  opportunityId,
  onPromoted,
}: {
  opportunityId: string;
  onPromoted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { devIdentity } = useAuth();
  const promote = usePromoteOpportunity(opportunityId);
  const navigate = useNavigate();

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Promote to an initiative"
      description="Creates a new initiative from this opportunity's title and problem framing. You'll be the owner unless you change it on the initiative afterward."
      trigger={<Button>Promote to initiative</Button>}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-fg">
          Owner: <span className="font-medium">{devIdentity?.displayName ?? devIdentity?.userId}</span>
        </p>
        {promote.isError && (
          <p role="alert" className="text-sm text-danger">
            Couldn&rsquo;t promote this opportunity. Please try again.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={promote.isPending}
            onClick={() => {
              void promote.mutateAsync({}).then((initiative) => {
                setOpen(false);
                onPromoted();
                void navigate({
                  to: '/initiatives/$initiativeId',
                  params: { initiativeId: initiative.id },
                });
              });
            }}
          >
            {promote.isPending ? 'Promoting…' : 'Promote'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function AddNodeForm({
  opportunityId,
  nodes,
}: {
  opportunityId: string;
  nodes: Array<{ id: string; label: string }>;
}) {
  const create = useCreateSolutionTreeNode(opportunityId);
  const [label, setLabel] = useState('');
  const [nodeType, setNodeType] = useState<SolutionTreeNodeType>('OUTCOME');
  const [parentNodeId, setParentNodeId] = useState<string | undefined>(undefined);

  const parentOptions = useMemo(
    () => nodes.map((n) => ({ value: n.id, label: n.label })),
    [nodes],
  );

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void create
          .mutateAsync({ label, nodeType, parentNodeId: parentNodeId ?? null })
          .then(() => setLabel(''));
      }}
    >
      <Input label="Node label" value={label} onChange={(e) => setLabel(e.target.value)} required />
      <Select
        label="Type"
        options={NODE_TYPE_OPTIONS}
        value={nodeType}
        onValueChange={(v) => setNodeType(v as SolutionTreeNodeType)}
      />
      {parentOptions.length > 0 && (
        <Select
          label="Parent node"
          options={parentOptions}
          value={parentNodeId}
          onValueChange={setParentNodeId}
          placeholder="None (root)"
        />
      )}
      <Button type="submit" disabled={create.isPending || !label}>
        Add node
      </Button>
    </form>
  );
}
