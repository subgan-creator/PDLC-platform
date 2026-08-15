import { apiFetch, toQueryString, type DevIdentity } from '../../lib/api-client';
import type {
  ActivityFeedItem,
  BulkUpdateInput,
  CreateInitiativeInput,
  EntityVersionRow,
  InitiativeComment,
  InitiativeLink,
  InitiativeWithRelations,
  ListInitiativesParams,
  ListInitiativesResult,
  Milestone,
  ProductArea,
  RaidItem,
  RepositionInput,
  RoadmapResult,
  StatusUpdate,
  UpdateInitiativeInput,
  VersionDiffResult,
} from './types';
import type { Initiative } from '@pdlc/shared-types';

// --- Initiatives -------------------------------------------------------

export function listInitiatives(
  params: ListInitiativesParams,
  dev?: DevIdentity,
): Promise<ListInitiativesResult> {
  return apiFetch(`/initiatives${toQueryString(params)}`, {}, dev);
}

export function getInitiative(id: string, dev?: DevIdentity): Promise<InitiativeWithRelations> {
  return apiFetch(`/initiatives/${id}`, {}, dev);
}

export function createInitiative(
  input: CreateInitiativeInput,
  dev?: DevIdentity,
): Promise<Initiative> {
  return apiFetch('/initiatives', { method: 'POST', body: JSON.stringify(input) }, dev);
}

export function updateInitiative(
  id: string,
  input: UpdateInitiativeInput,
  dev?: DevIdentity,
): Promise<Initiative> {
  return apiFetch(`/initiatives/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, dev);
}

export function repositionInitiative(
  id: string,
  input: RepositionInput,
  dev?: DevIdentity,
): Promise<Initiative> {
  return apiFetch(
    `/initiatives/${id}/reposition`,
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

export function archiveInitiative(
  id: string,
  version: number,
  dev?: DevIdentity,
): Promise<Initiative> {
  return apiFetch(
    `/initiatives/${id}`,
    { method: 'DELETE', body: JSON.stringify({ version }) },
    dev,
  );
}

export function bulkUpdateInitiatives(
  input: BulkUpdateInput,
  dev?: DevIdentity,
): Promise<{ updated: number }> {
  return apiFetch('/initiatives/bulk', { method: 'POST', body: JSON.stringify(input) }, dev);
}

/**
 * CSV export needs the dev-stub auth headers attached, so a plain `<a
 * href>` (no way to set headers) won't authenticate — fetch as a blob and
 * trigger the download client-side instead.
 */
export async function downloadInitiativesCsv(
  params: ListInitiativesParams,
  dev?: DevIdentity,
): Promise<void> {
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
  const headers = new Headers();
  if (dev) {
    headers.set('x-dev-user-id', dev.userId);
    headers.set('x-dev-tenant-id', dev.tenantId);
  }
  const res = await fetch(`${base}/initiatives/export${toQueryString(params)}`, { headers });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'initiatives.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function listVersions(id: string, dev?: DevIdentity): Promise<EntityVersionRow[]> {
  return apiFetch(`/initiatives/${id}/versions`, {}, dev);
}

export function getVersionDiff(
  id: string,
  version: number,
  dev?: DevIdentity,
): Promise<VersionDiffResult> {
  return apiFetch(`/initiatives/${id}/versions/${version}/diff`, {}, dev);
}

export function getActivity(initiativeId: string, dev?: DevIdentity): Promise<ActivityFeedItem[]> {
  return apiFetch(`/initiatives/${initiativeId}/activity`, {}, dev);
}

// --- Product areas -------------------------------------------------------

export function listProductAreas(dev?: DevIdentity): Promise<ProductArea[]> {
  return apiFetch('/product-areas', {}, dev);
}

// --- RAID ------------------------------------------------------------------

export function listRaidItems(initiativeId: string, dev?: DevIdentity): Promise<RaidItem[]> {
  return apiFetch(`/initiatives/${initiativeId}/raid`, {}, dev);
}

export function createRaidItem(
  initiativeId: string,
  input: Omit<RaidItem, 'id' | 'initiativeId' | 'createdAt' | 'updatedAt'>,
  dev?: DevIdentity,
): Promise<RaidItem> {
  return apiFetch(
    `/initiatives/${initiativeId}/raid`,
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

export function updateRaidItem(
  initiativeId: string,
  id: string,
  input: Partial<Omit<RaidItem, 'id' | 'initiativeId' | 'createdAt' | 'updatedAt'>>,
  dev?: DevIdentity,
): Promise<RaidItem> {
  return apiFetch(
    `/initiatives/${initiativeId}/raid/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    dev,
  );
}

export function deleteRaidItem(initiativeId: string, id: string, dev?: DevIdentity): Promise<void> {
  return apiFetch(`/initiatives/${initiativeId}/raid/${id}`, { method: 'DELETE' }, dev);
}

// --- Milestones --------------------------------------------------------------

export function listMilestones(initiativeId: string, dev?: DevIdentity): Promise<Milestone[]> {
  return apiFetch(`/initiatives/${initiativeId}/milestones`, {}, dev);
}

export function createMilestone(
  initiativeId: string,
  input: Omit<Milestone, 'id' | 'initiativeId' | 'createdAt' | 'updatedAt'>,
  dev?: DevIdentity,
): Promise<Milestone> {
  return apiFetch(
    `/initiatives/${initiativeId}/milestones`,
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

export function updateMilestone(
  initiativeId: string,
  id: string,
  input: Partial<Omit<Milestone, 'id' | 'initiativeId' | 'createdAt' | 'updatedAt'>>,
  dev?: DevIdentity,
): Promise<Milestone> {
  return apiFetch(
    `/initiatives/${initiativeId}/milestones/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    dev,
  );
}

export function deleteMilestone(
  initiativeId: string,
  id: string,
  dev?: DevIdentity,
): Promise<void> {
  return apiFetch(`/initiatives/${initiativeId}/milestones/${id}`, { method: 'DELETE' }, dev);
}

// --- Status updates ------------------------------------------------------------

export function listStatusUpdates(
  initiativeId: string,
  dev?: DevIdentity,
): Promise<StatusUpdate[]> {
  return apiFetch(`/initiatives/${initiativeId}/status-updates`, {}, dev);
}

export function createStatusUpdate(
  initiativeId: string,
  input: Pick<
    StatusUpdate,
    'periodStart' | 'periodEnd' | 'progress' | 'next' | 'risks' | 'asks' | 'healthAtTimeOfUpdate'
  >,
  dev?: DevIdentity,
): Promise<StatusUpdate> {
  return apiFetch(
    `/initiatives/${initiativeId}/status-updates`,
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

// --- Links ---------------------------------------------------------------------

export function listLinks(initiativeId: string, dev?: DevIdentity): Promise<InitiativeLink[]> {
  return apiFetch(`/initiatives/${initiativeId}/links`, {}, dev);
}

export function createLink(
  initiativeId: string,
  input: Pick<InitiativeLink, 'targetType' | 'targetId' | 'url' | 'label'>,
  dev?: DevIdentity,
): Promise<InitiativeLink> {
  return apiFetch(
    `/initiatives/${initiativeId}/links`,
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

export function deleteLink(initiativeId: string, id: string, dev?: DevIdentity): Promise<void> {
  return apiFetch(`/initiatives/${initiativeId}/links/${id}`, { method: 'DELETE' }, dev);
}

// --- Comments --------------------------------------------------------------------

export function listComments(
  initiativeId: string,
  dev?: DevIdentity,
): Promise<InitiativeComment[]> {
  return apiFetch(`/initiatives/${initiativeId}/comments`, {}, dev);
}

export function createComment(
  initiativeId: string,
  input: { parentCommentId?: string | null; body: string; mentionedUserIds?: string[] },
  dev?: DevIdentity,
): Promise<InitiativeComment> {
  return apiFetch(
    `/initiatives/${initiativeId}/comments`,
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

export function deleteComment(initiativeId: string, id: string, dev?: DevIdentity): Promise<void> {
  return apiFetch(`/initiatives/${initiativeId}/comments/${id}`, { method: 'DELETE' }, dev);
}

// --- Watchers --------------------------------------------------------------------

export function listWatchers(
  initiativeId: string,
  dev?: DevIdentity,
): Promise<Array<{ userId: string }>> {
  return apiFetch(`/initiatives/${initiativeId}/watchers`, {}, dev);
}

export function watchInitiative(initiativeId: string, dev?: DevIdentity): Promise<void> {
  return apiFetch(`/initiatives/${initiativeId}/watchers/me`, { method: 'POST' }, dev);
}

export function unwatchInitiative(initiativeId: string, dev?: DevIdentity): Promise<void> {
  return apiFetch(`/initiatives/${initiativeId}/watchers/me`, { method: 'DELETE' }, dev);
}

// --- Stakeholders (RACI) --------------------------------------------------------

export interface StakeholderRow {
  initiativeId: string;
  userId: string;
  raciRole: 'RESPONSIBLE' | 'ACCOUNTABLE' | 'CONSULTED' | 'INFORMED';
}

export function listStakeholders(
  initiativeId: string,
  dev?: DevIdentity,
): Promise<StakeholderRow[]> {
  return apiFetch(`/initiatives/${initiativeId}/stakeholders`, {}, dev);
}

export function addStakeholder(
  initiativeId: string,
  input: { userId: string; raciRole: StakeholderRow['raciRole'] },
  dev?: DevIdentity,
): Promise<StakeholderRow> {
  return apiFetch(
    `/initiatives/${initiativeId}/stakeholders`,
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

export function removeStakeholder(
  initiativeId: string,
  userId: string,
  raciRole: StakeholderRow['raciRole'],
  dev?: DevIdentity,
): Promise<void> {
  return apiFetch(
    `/initiatives/${initiativeId}/stakeholders/${userId}/${raciRole}`,
    { method: 'DELETE' },
    dev,
  );
}

// --- Roadmap ---------------------------------------------------------------------

export function getRoadmap(
  params: {
    groupBy?: 'none' | 'area' | 'team';
    phase?: string;
    health?: string;
    productAreaId?: string;
    tag?: string;
    q?: string;
  },
  dev?: DevIdentity,
): Promise<RoadmapResult> {
  return apiFetch(`/roadmap${toQueryString(params)}`, {}, dev);
}
