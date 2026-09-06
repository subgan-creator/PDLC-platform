import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import ReactFlow, {
  Background,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button, Dialog, Input, Select, useToast } from '@pdlc/ui';
import { isApiError } from '../../lib/api-client';
import { useAuth } from '../../auth/auth-context';
import {
  useCreateSolutionTreeNode,
  useDeleteSolutionTreeNode,
  useInsights,
  useOpportunity,
  usePromoteOpportunity,
  useSolutionTreeNodes,
  useUpdateSolutionTreeNode,
} from '../../features/discovery/hooks';
import type { OpportunitySolutionTreeNode, SolutionTreeNodeType } from '../../features/discovery/types';

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

/** Outcome -> Opportunity -> Solution/Experiment is the natural next level down; used to pre-fill the quick-add-child dialog's Type field. */
function suggestChildType(parentType: SolutionTreeNodeType): SolutionTreeNodeType {
  if (parentType === 'OUTCOME') return 'OPPORTUNITY';
  if (parentType === 'OPPORTUNITY') return 'SOLUTION';
  return 'EXPERIMENT';
}

/**
 * Simple level-order tree layout — BFS from roots (parentNodeId === null),
 * one row per depth, nodes spread evenly across that row. Trees here are
 * small (a handful of nodes, 2-3 levels — see prisma/seed.ts) so this
 * doesn't need a real layout algorithm (dagre/elk aren't installed; this
 * is the first real reactflow usage in the app, see CLAUDE.md tech stack —
 * no existing pattern to extend). Node positions aren't persisted (no x/y
 * columns on OpportunitySolutionTreeNode) — this recomputes on every load,
 * which is why manually dragging a node in the canvas doesn't stick today.
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

interface SolutionNodeData {
  label: string;
  nodeType: SolutionTreeNodeType;
  opportunityId: string;
  renaming: boolean;
  onRenameDone: () => void;
}

/**
 * Custom React Flow node — added after user feedback that adding/renaming
 * nodes only via a bottom form and a modal felt like filling out a form,
 * not editing a diagram. Two direct-manipulation affordances live ON the
 * node itself:
 *   - double-click the label to rename it inline, no dialog
 *   - hover to reveal a "+" that opens a small quick-add-child dialog,
 *     pre-filled with this node as the parent
 * Single-click still opens the existing full edit dialog (Type + Delete —
 * see EditNodeDialog) via OpportunityDetailPage's onNodeClick; that's
 * unchanged. This is additive on top of the existing form/dialog, not a
 * replacement, specifically so a future pass (persisted drag positions,
 * drag-to-reparent) can layer on without reworking this.
 *
 * `renaming` is driven by the PARENT via React Flow's own
 * `onNodeDoubleClick` prop, not a plain DOM onDoubleClick here — a native
 * onDoubleClick on inner node content races with React Flow's onNodeClick
 * (every double-click fires two click events first), so the single-click
 * edit dialog was winning every time before the actual dblclick was
 * recognized. onNodeDoubleClick is React Flow's own dedicated event,
 * which it disambiguates from a single click internally.
 */
function SolutionNodeCard({ id, data }: NodeProps<SolutionNodeData>) {
  const { label, nodeType, opportunityId, renaming, onRenameDone } = data;
  const update = useUpdateSolutionTreeNode(opportunityId);
  const colors = NODE_TYPE_COLORS[nodeType];
  const [draft, setDraft] = useState(label);
  const [addingChild, setAddingChild] = useState(false);

  // Re-seed the draft from the current label each time rename mode opens
  // (not just on mount — this node instance persists across renders).
  useEffect(() => {
    if (renaming) setDraft(label);
  }, [renaming, label]);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) {
      void update.mutateAsync({ id, input: { label: trimmed } });
    }
    onRenameDone();
  }

  return (
    <div
      className="group relative"
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: 8,
        padding: 8,
        width: 200,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{nodeType}</div>
      {renaming ? (
        <input
          autoFocus
          className="w-full rounded border border-border bg-bg px-1 text-sm text-fg focus-visible:outline-none"
          value={draft}
          aria-label={`Rename node "${label}"`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') {
              setDraft(label);
              onRenameDone();
            }
          }}
          // data-no-node-click, checked in OpportunityDetailPage's
          // onNodeClick below — React Flow's own node-click handling
          // isn't stopped by a plain stopPropagation() from a descendant
          // element (it doesn't rely solely on native DOM bubbling), so
          // clicking inside this input while renaming was also opening
          // the full edit dialog underneath/behind it.
          data-no-node-click
        />
      ) : (
        <div className="cursor-text text-sm text-fg" title="Double-click to rename">
          {label}
        </div>
      )}
      <button
        type="button"
        aria-label={`Add a child node under "${label}"`}
        title="Add a child node here"
        className="absolute -bottom-3 left-1/2 hidden h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-sm font-bold leading-none text-white shadow group-hover:flex group-focus-within:flex"
        onClick={() => setAddingChild(true)}
        data-no-node-click
      >
        +
      </button>
      <Handle type="source" position={Position.Bottom} />

      <QuickAddChildDialog
        open={addingChild}
        onClose={() => setAddingChild(false)}
        opportunityId={opportunityId}
        parentNodeId={id}
        parentLabel={label}
        suggestedType={suggestChildType(nodeType)}
      />
    </div>
  );
}

const NODE_TYPES: NodeTypes = { solutionNode: SolutionNodeCard };

export function OpportunityDetailPage() {
  const { opportunityId } = useParams({ from: '/discovery/opportunities/$opportunityId' });
  const { data: opportunity, isLoading } = useOpportunity(opportunityId);
  const { data: treeNodes } = useSolutionTreeNodes(opportunityId);
  const { data: insightsData } = useInsights({ limit: 200 });
  const { push } = useToast();
  const [editingNode, setEditingNode] = useState<OpportunitySolutionTreeNode | null>(null);
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);

  if (isLoading || !opportunity) {
    return <p className="text-sm text-muted">Loading opportunity…</p>;
  }

  const linkedInsights = (insightsData?.items ?? []).filter((i) =>
    opportunity.insightIds.includes(i.id),
  );

  const positions = layoutTree(treeNodes ?? []);
  const rfNodes: Node<SolutionNodeData>[] = (treeNodes ?? []).map((n) => ({
    id: n.id,
    type: 'solutionNode',
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: {
      label: n.label,
      nodeType: n.nodeType,
      opportunityId,
      renaming: n.id === renamingNodeId,
      onRenameDone: () => setRenamingNodeId(null),
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
        <p className="text-sm text-muted">
          Outcome → Opportunity → Solution/Experiment, laid out as a tree. Hover a node for a{' '}
          <strong className="text-fg">+</strong> to add a child, double-click its label to rename it,
          or click it for more options (change type, delete).
        </p>
        <div
          className="h-96 rounded-md border border-border"
          role="img"
          aria-label="Opportunity solution tree diagram"
        >
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            fitView
            proOptions={{ hideAttribution: true }}
            onNodeClick={(event, node) => {
              // The hover "+" (add child) and the rename input mark
              // themselves with data-no-node-click — see SolutionNodeCard.
              // React Flow's own node-click handling isn't stopped by a
              // plain event.stopPropagation() from a descendant element,
              // so this app-level guard is what actually prevents those
              // interactions from also opening the full edit dialog.
              if ((event.target as HTMLElement).closest('[data-no-node-click]')) return;
              const match = (treeNodes ?? []).find((n) => n.id === node.id);
              if (match) setEditingNode(match);
            }}
            onNodeDoubleClick={(event, node) => {
              if ((event.target as HTMLElement).closest('[data-no-node-click]')) return;
              setRenamingNodeId(node.id);
            }}
          >
            <Background />
          </ReactFlow>
        </div>
        <AddNodeForm opportunityId={opportunityId} nodes={treeNodes ?? []} />
      </section>

      <EditNodeDialog
        key={editingNode?.id ?? 'none'}
        opportunityId={opportunityId}
        node={editingNode}
        hasChildren={(treeNodes ?? []).some((n) => n.parentNodeId === editingNode?.id)}
        onClose={() => setEditingNode(null)}
      />
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

function EditNodeDialog({
  opportunityId,
  node,
  hasChildren,
  onClose,
}: {
  opportunityId: string;
  node: OpportunitySolutionTreeNode | null;
  hasChildren: boolean;
  onClose: () => void;
}) {
  const update = useUpdateSolutionTreeNode(opportunityId);
  const del = useDeleteSolutionTreeNode(opportunityId);
  const { push } = useToast();
  const [label, setLabel] = useState(node?.label ?? '');
  const [nodeType, setNodeType] = useState<SolutionTreeNodeType>(node?.nodeType ?? 'OUTCOME');

  return (
    <Dialog
      open={!!node}
      onOpenChange={(open) => !open && onClose()}
      title={node ? `Edit node: ${node.label}` : 'Edit node'}
      description="You can also double-click a node directly on the canvas to rename it."
    >
      {node && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void update.mutateAsync({ id: node.id, input: { label, nodeType } }).then(onClose);
          }}
        >
          <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <Select
            label="Type"
            options={NODE_TYPE_OPTIONS}
            value={nodeType}
            onValueChange={(v) => setNodeType(v as SolutionTreeNodeType)}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={del.isPending || hasChildren}
              title={hasChildren ? 'Delete its child nodes first' : undefined}
              onClick={() => {
                void del
                  .mutateAsync(node.id)
                  .then(onClose)
                  .catch((err: unknown) => {
                    push({
                      title: 'Could not delete node',
                      description: isApiError(err) ? err.problem.detail : undefined,
                      variant: 'danger',
                    });
                  });
              }}
            >
              Delete
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={update.isPending || !label}>
                Save
              </Button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/**
 * Triggered by a node's hover "+" (see SolutionNodeCard) — same
 * useCreateSolutionTreeNode mutation as AddNodeForm below, just entered
 * from the canvas with the parent already implied instead of picked from
 * a dropdown. Local `open`/form state is naturally scoped per node
 * instance (this dialog is rendered once per SolutionNodeCard), so unlike
 * EditNodeDialog it doesn't need a key-remount trick to reset between uses.
 */
function QuickAddChildDialog({
  open,
  onClose,
  opportunityId,
  parentNodeId,
  parentLabel,
  suggestedType,
}: {
  open: boolean;
  onClose: () => void;
  opportunityId: string;
  parentNodeId: string;
  parentLabel: string;
  suggestedType: SolutionTreeNodeType;
}) {
  const create = useCreateSolutionTreeNode(opportunityId);
  const [label, setLabel] = useState('');
  const [nodeType, setNodeType] = useState<SolutionTreeNodeType>(suggestedType);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Add a child node"
      description={`Adding under "${parentLabel}".`}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create
            .mutateAsync({ label, nodeType, parentNodeId })
            .then(() => {
              setLabel('');
              setNodeType(suggestedType);
              onClose();
            });
        }}
      >
        <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} required autoFocus />
        <Select
          label="Type"
          options={NODE_TYPE_OPTIONS}
          value={nodeType}
          onValueChange={(v) => setNodeType(v as SolutionTreeNodeType)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending || !label}>
            Add
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * The original bottom form — kept as the only way to add the very first
 * (root) node, since the hover-"+" affordance needs an existing node to
 * hover over, and as a fallback path generally.
 */
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
