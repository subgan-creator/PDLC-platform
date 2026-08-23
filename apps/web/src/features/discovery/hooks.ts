import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/auth-context';
import * as api from './api';
import type {
  CreateEvidenceItemInput,
  CreateInsightInput,
  CreateOpportunityInput,
  CreateSolutionTreeNodeInput,
  CreateSourceInput,
  ListInsightsParams,
  ListOpportunitiesParams,
  PromoteOpportunityInput,
  UpdateInsightInput,
  UpdateOpportunityInput,
  UpdateSourceInput,
} from './types';

// Same shape as features/initiatives/hooks.ts throughout: read
// `devIdentity` from AuthProvider, pass it through, disable until set.

// --- Sources -----------------------------------------------------------------

export function useSources() {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['discovery', 'sources'],
    queryFn: () => api.listSources(devIdentity ?? undefined),
    enabled: !!devIdentity,
  });
}

export function useCreateSource() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSourceInput) => api.createSource(input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery', 'sources'] }),
  });
}

export function useUpdateSource() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSourceInput }) =>
      api.updateSource(id, input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery', 'sources'] }),
  });
}

export function useDeleteSource() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSource(id, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery', 'sources'] }),
  });
}

// --- Evidence ------------------------------------------------------------------

export function useEvidenceItems(sourceId: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['discovery', 'evidence', sourceId],
    queryFn: () => api.listEvidenceItems(sourceId as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!sourceId,
  });
}

export function useCreateEvidenceItem(sourceId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEvidenceItemInput) =>
      api.createEvidenceItem(sourceId, input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery', 'evidence', sourceId] }),
  });
}

export function useDeleteEvidenceItem(sourceId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteEvidenceItem(sourceId, id, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery', 'evidence', sourceId] }),
  });
}

/**
 * Evidence only has a per-source list endpoint (nested, like RAID under
 * Initiative — see api.ts) — there's no flat "all evidence" endpoint. The
 * Insight-creation form needs to let a user pick evidence across every
 * source, so this fans out one query per source with `useQueries` (the
 * correct React Query pattern for a dynamic array of parallel queries —
 * calling useEvidenceItems in a loop would break the rules of hooks) and
 * flattens the results. Fine at this data volume (a handful of sources,
 * a few dozen evidence items); would need a real cross-source endpoint if
 * that ever changes.
 */
export function useAllEvidenceItems() {
  const { devIdentity } = useAuth();
  const { data: sources } = useSources();
  const results = useQueries({
    queries: (sources ?? []).map((s) => ({
      queryKey: ['discovery', 'evidence', s.id],
      queryFn: () => api.listEvidenceItems(s.id, devIdentity ?? undefined),
      enabled: !!devIdentity,
    })),
  });
  const isLoading = results.some((r) => r.isLoading);
  const items = results.flatMap((r) => r.data ?? []);
  return { items, isLoading };
}

// --- Insights ------------------------------------------------------------------

export function useInsights(params: ListInsightsParams) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['discovery', 'insights', 'list', params],
    queryFn: () => api.listInsights(params, devIdentity ?? undefined),
    enabled: !!devIdentity,
  });
}

export function useCreateInsight() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInsightInput) => api.createInsight(input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery', 'insights', 'list'] }),
  });
}

export function useUpdateInsight() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateInsightInput }) =>
      api.updateInsight(id, input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery', 'insights', 'list'] }),
  });
}

export function useDeleteInsight() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteInsight(id, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery', 'insights', 'list'] }),
  });
}

// --- Opportunities ---------------------------------------------------------------

export function useOpportunities(params: ListOpportunitiesParams) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['discovery', 'opportunities', 'list', params],
    queryFn: () => api.listOpportunities(params, devIdentity ?? undefined),
    enabled: !!devIdentity,
  });
}

export function useOpportunity(id: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['discovery', 'opportunities', 'detail', id],
    queryFn: () => api.getOpportunity(id as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!id,
  });
}

export function useCreateOpportunity() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOpportunityInput) =>
      api.createOpportunity(input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery', 'opportunities', 'list'] }),
  });
}

export function useUpdateOpportunity(id: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOpportunityInput) =>
      api.updateOpportunity(id, input, devIdentity ?? undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['discovery', 'opportunities', 'detail', id] });
      void qc.invalidateQueries({ queryKey: ['discovery', 'opportunities', 'list'] });
    },
  });
}

export function useDeleteOpportunity() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteOpportunity(id, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovery', 'opportunities', 'list'] }),
  });
}

/** On success, also invalidate the initiatives list — a promote creates a new one. */
export function usePromoteOpportunity(id: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PromoteOpportunityInput) =>
      api.promoteOpportunity(id, input, devIdentity ?? undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['discovery', 'opportunities', 'detail', id] });
      void qc.invalidateQueries({ queryKey: ['discovery', 'opportunities', 'list'] });
      void qc.invalidateQueries({ queryKey: ['initiatives', 'list'] });
    },
  });
}

// --- Opportunity Solution Tree ---------------------------------------------------

export function useSolutionTreeNodes(opportunityId: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['discovery', 'solution-tree', opportunityId],
    queryFn: () => api.listSolutionTreeNodes(opportunityId as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!opportunityId,
  });
}

export function useCreateSolutionTreeNode(opportunityId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSolutionTreeNodeInput) =>
      api.createSolutionTreeNode(opportunityId, input, devIdentity ?? undefined),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['discovery', 'solution-tree', opportunityId] }),
  });
}

export function useDeleteSolutionTreeNode(opportunityId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.deleteSolutionTreeNode(opportunityId, id, devIdentity ?? undefined),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['discovery', 'solution-tree', opportunityId] }),
  });
}
