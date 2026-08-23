import { apiFetch, toQueryString, type DevIdentity } from '../../lib/api-client';
import type { Initiative } from '@pdlc/shared-types';
import type {
  CreateEvidenceItemInput,
  CreateInsightInput,
  CreateOpportunityInput,
  CreateSolutionTreeNodeInput,
  CreateSourceInput,
  EvidenceItem,
  Insight,
  ListInsightsParams,
  ListInsightsResult,
  ListOpportunitiesParams,
  ListOpportunitiesResult,
  Opportunity,
  OpportunitySolutionTreeNode,
  PromoteOpportunityInput,
  Source,
  UpdateEvidenceItemInput,
  UpdateInsightInput,
  UpdateOpportunityInput,
  UpdateSolutionTreeNodeInput,
  UpdateSourceInput,
} from './types';

// --- Sources ---------------------------------------------------------------

export function listSources(dev?: DevIdentity): Promise<Source[]> {
  return apiFetch('/discovery/sources', {}, dev);
}

export function createSource(input: CreateSourceInput, dev?: DevIdentity): Promise<Source> {
  return apiFetch('/discovery/sources', { method: 'POST', body: JSON.stringify(input) }, dev);
}

export function updateSource(
  id: string,
  input: UpdateSourceInput,
  dev?: DevIdentity,
): Promise<Source> {
  return apiFetch(
    `/discovery/sources/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    dev,
  );
}

export function deleteSource(id: string, dev?: DevIdentity): Promise<void> {
  return apiFetch(`/discovery/sources/${id}`, { method: 'DELETE' }, dev);
}

// --- Evidence ----------------------------------------------------------------

export function listEvidenceItems(sourceId: string, dev?: DevIdentity): Promise<EvidenceItem[]> {
  return apiFetch(`/discovery/sources/${sourceId}/evidence`, {}, dev);
}

export function createEvidenceItem(
  sourceId: string,
  input: CreateEvidenceItemInput,
  dev?: DevIdentity,
): Promise<EvidenceItem> {
  return apiFetch(
    `/discovery/sources/${sourceId}/evidence`,
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

export function updateEvidenceItem(
  sourceId: string,
  id: string,
  input: UpdateEvidenceItemInput,
  dev?: DevIdentity,
): Promise<EvidenceItem> {
  return apiFetch(
    `/discovery/sources/${sourceId}/evidence/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    dev,
  );
}

export function deleteEvidenceItem(
  sourceId: string,
  id: string,
  dev?: DevIdentity,
): Promise<void> {
  return apiFetch(`/discovery/sources/${sourceId}/evidence/${id}`, { method: 'DELETE' }, dev);
}

// --- Insights ----------------------------------------------------------------

export function listInsights(
  params: ListInsightsParams,
  dev?: DevIdentity,
): Promise<ListInsightsResult> {
  return apiFetch(`/discovery/insights${toQueryString(params)}`, {}, dev);
}

export function createInsight(input: CreateInsightInput, dev?: DevIdentity): Promise<Insight> {
  return apiFetch('/discovery/insights', { method: 'POST', body: JSON.stringify(input) }, dev);
}

export function updateInsight(
  id: string,
  input: UpdateInsightInput,
  dev?: DevIdentity,
): Promise<Insight> {
  return apiFetch(
    `/discovery/insights/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    dev,
  );
}

export function deleteInsight(id: string, dev?: DevIdentity): Promise<void> {
  return apiFetch(`/discovery/insights/${id}`, { method: 'DELETE' }, dev);
}

// --- Opportunities -------------------------------------------------------------

export function listOpportunities(
  params: ListOpportunitiesParams,
  dev?: DevIdentity,
): Promise<ListOpportunitiesResult> {
  return apiFetch(`/discovery/opportunities${toQueryString(params)}`, {}, dev);
}

export function getOpportunity(id: string, dev?: DevIdentity): Promise<Opportunity> {
  return apiFetch(`/discovery/opportunities/${id}`, {}, dev);
}

export function createOpportunity(
  input: CreateOpportunityInput,
  dev?: DevIdentity,
): Promise<Opportunity> {
  return apiFetch(
    '/discovery/opportunities',
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

export function updateOpportunity(
  id: string,
  input: UpdateOpportunityInput,
  dev?: DevIdentity,
): Promise<Opportunity> {
  return apiFetch(
    `/discovery/opportunities/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    dev,
  );
}

export function deleteOpportunity(id: string, dev?: DevIdentity): Promise<void> {
  return apiFetch(`/discovery/opportunities/${id}`, { method: 'DELETE' }, dev);
}

export function promoteOpportunity(
  id: string,
  input: PromoteOpportunityInput,
  dev?: DevIdentity,
): Promise<Initiative> {
  return apiFetch(
    `/discovery/opportunities/${id}/promote`,
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

// --- Opportunity Solution Tree -------------------------------------------------

export function listSolutionTreeNodes(
  opportunityId: string,
  dev?: DevIdentity,
): Promise<OpportunitySolutionTreeNode[]> {
  return apiFetch(`/discovery/opportunities/${opportunityId}/tree`, {}, dev);
}

export function createSolutionTreeNode(
  opportunityId: string,
  input: CreateSolutionTreeNodeInput,
  dev?: DevIdentity,
): Promise<OpportunitySolutionTreeNode> {
  return apiFetch(
    `/discovery/opportunities/${opportunityId}/tree`,
    { method: 'POST', body: JSON.stringify(input) },
    dev,
  );
}

export function updateSolutionTreeNode(
  opportunityId: string,
  id: string,
  input: UpdateSolutionTreeNodeInput,
  dev?: DevIdentity,
): Promise<OpportunitySolutionTreeNode> {
  return apiFetch(
    `/discovery/opportunities/${opportunityId}/tree/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    dev,
  );
}

export function deleteSolutionTreeNode(
  opportunityId: string,
  id: string,
  dev?: DevIdentity,
): Promise<void> {
  return apiFetch(`/discovery/opportunities/${opportunityId}/tree/${id}`, { method: 'DELETE' }, dev);
}
