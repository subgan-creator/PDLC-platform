import { useEffect, useMemo, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@tanstack/react-router';
import type { Initiative, RoadmapBucket } from '@pdlc/shared-types';
import { Select, Tabs } from '@pdlc/ui';
import { useRepositionInitiative, useRoadmap } from '../../features/initiatives/hooks';
import { HealthBadge } from '../../features/initiatives/components/badges';

const BUCKETS: RoadmapBucket[] = ['NOW', 'NEXT', 'LATER'];
const BUCKET_LABEL: Record<RoadmapBucket, string> = { NOW: 'Now', NEXT: 'Next', LATER: 'Later' };

/**
 * Two views over the same `/roadmap` data (Prompt 1): drag-to-reprioritize
 * swimlanes, and a Gantt-lite timeline by quarter. Both read the same
 * query, so switching views never shows stale data relative to the other.
 */
export function RoadmapPage() {
  const [groupBy, setGroupBy] = useState<'none' | 'area' | 'team'>('none');
  const { data } = useRoadmap({ groupBy });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg">Roadmap</h1>
        <Select
          label="Group by"
          options={[
            { value: 'none', label: 'No grouping' },
            { value: 'area', label: 'Product area' },
            { value: 'team', label: 'Team' },
          ]}
          value={groupBy}
          onValueChange={(v) => setGroupBy(v as typeof groupBy)}
        />
      </div>

      <Tabs
        aria-label="Roadmap view"
        items={[
          {
            value: 'buckets',
            label: 'Now / Next / Later',
            content: <BucketsView items={data?.items ?? []} />,
          },
          {
            value: 'timeline',
            label: 'Timeline',
            content: <TimelineView items={data?.items ?? []} />,
          },
        ]}
      />
    </div>
  );
}

function BucketsView({ items }: { items: Initiative[] }) {
  const [buckets, setBuckets] = useState<Record<RoadmapBucket, Initiative[]>>({
    NOW: [],
    NEXT: [],
    LATER: [],
  });
  const reposition = useRepositionInitiative();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    const next: Record<RoadmapBucket, Initiative[]> = { NOW: [], NEXT: [], LATER: [] };
    for (const item of items) {
      if (item.roadmapBucket && BUCKETS.includes(item.roadmapBucket))
        next[item.roadmapBucket].push(item);
    }
    for (const bucket of BUCKETS)
      next[bucket].sort((a, b) => (a.roadmapRank ?? 0) - (b.roadmapRank ?? 0));
    setBuckets(next);
  }, [items]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceBucket = BUCKETS.find((b) => buckets[b].some((i) => i.id === activeId));
    if (!sourceBucket) return;
    // Drop target is either another card (use its bucket) or a bucket's empty-column marker id.
    const targetBucket =
      BUCKETS.find((b) => buckets[b].some((i) => i.id === overId)) ??
      BUCKETS.find((b) => `bucket-${b}` === overId);
    if (!targetBucket) return;

    const movedItem = buckets[sourceBucket].find((i) => i.id === activeId);
    if (!movedItem) return;

    const targetItems = buckets[targetBucket].filter((i) => i.id !== activeId);
    const overIndex = targetItems.findIndex((i) => i.id === overId);
    const insertAt = overIndex === -1 ? targetItems.length : overIndex;

    const before =
      targetItems[insertAt - 1]?.roadmapRank ?? (targetItems[insertAt]?.roadmapRank ?? 1000) - 1000;
    const after =
      targetItems[insertAt]?.roadmapRank ?? (targetItems[insertAt - 1]?.roadmapRank ?? 0) + 1000;
    const newRank = (before + after) / 2;

    setBuckets((prev) => {
      const updated = {
        ...prev,
        [sourceBucket]: prev[sourceBucket].filter((i) => i.id !== activeId),
      };
      const list = [...updated[targetBucket]];
      list.splice(insertAt, 0, { ...movedItem, roadmapBucket: targetBucket, roadmapRank: newRank });
      return { ...updated, [targetBucket]: list };
    });

    reposition.mutate({
      id: activeId,
      input: { version: movedItem.version, roadmapBucket: targetBucket, roadmapRank: newRank },
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {BUCKETS.map((bucket) => (
          <div
            key={bucket}
            id={`bucket-${bucket}`}
            className="flex flex-col gap-2 rounded-md border border-border p-3"
          >
            <h2 className="text-sm font-semibold text-fg">
              {BUCKET_LABEL[bucket]} <span className="text-muted">({buckets[bucket].length})</span>
            </h2>
            <SortableContext
              items={buckets[bucket].map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex min-h-16 flex-col gap-2">
                {buckets[bucket].map((item) => (
                  <RoadmapCard key={item.id} item={item} />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}

function RoadmapCard({ item }: { item: Initiative }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab flex-col gap-1 rounded-md border border-border bg-bg p-2 text-sm active:cursor-grabbing"
    >
      <Link
        to="/initiatives/$initiativeId"
        params={{ initiativeId: item.id }}
        className="font-medium text-fg hover:underline"
      >
        {item.title}
      </Link>
      <HealthBadge health={item.health} />
    </div>
  );
}

function TimelineView({ items }: { items: Initiative[] }) {
  const dated = items.filter((i) => i.plannedStart && i.plannedEnd);
  const { min, max } = useMemo(() => {
    if (dated.length === 0) return { min: new Date(), max: new Date() };
    const starts = dated.map((i) => new Date(i.plannedStart!).getTime());
    const ends = dated.map((i) => new Date(i.plannedEnd!).getTime());
    return { min: new Date(Math.min(...starts)), max: new Date(Math.max(...ends)) };
  }, [dated]);

  const totalMs = Math.max(1, max.getTime() - min.getTime());

  function pct(date: Date): number {
    return ((date.getTime() - min.getTime()) / totalMs) * 100;
  }

  const quarters = useMemo(() => {
    const marks: Date[] = [];
    const cursor = new Date(min.getFullYear(), Math.floor(min.getMonth() / 3) * 3, 1);
    while (cursor <= max) {
      marks.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 3);
    }
    return marks;
  }, [min, max]);

  if (dated.length === 0) {
    return (
      <p className="text-sm text-muted">
        No initiatives have both a planned start and end date yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="relative min-w-[720px] border-t border-border pt-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex text-xs text-muted">
          {quarters.map((q) => (
            <span key={q.toISOString()} className="absolute" style={{ left: `${pct(q)}%` }}>
              Q{Math.floor(q.getMonth() / 3) + 1} {q.getFullYear()}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {dated.map((item) => {
            const start = new Date(item.plannedStart!);
            const end = new Date(item.plannedEnd!);
            return (
              <div key={item.id} className="flex items-center gap-2">
                <Link
                  to="/initiatives/$initiativeId"
                  params={{ initiativeId: item.id }}
                  className="w-48 shrink-0 truncate text-sm text-fg hover:underline"
                >
                  {item.title}
                </Link>
                <div className="relative h-6 flex-1">
                  <div
                    className="absolute h-6 rounded bg-primary/70"
                    style={{
                      left: `${pct(start)}%`,
                      width: `${Math.max(1, pct(end) - pct(start))}%`,
                    }}
                    title={`${start.toLocaleDateString()} – ${end.toLocaleDateString()}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
