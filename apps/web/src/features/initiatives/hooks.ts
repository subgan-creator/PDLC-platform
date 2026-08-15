import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/auth-context';
import * as api from './api';
import type {
  BulkUpdateInput,
  CreateInitiativeInput,
  ListInitiativesParams,
  RepositionInput,
  UpdateInitiativeInput,
} from './types';
import type { Milestone, RaidItem } from '@pdlc/shared-types';

/**
 * Every hook here follows the same shape: read `devIdentity` from
 * AuthProvider, pass it through to the fetch layer, and disable the query
 * until it's set (dev-stub mode — see apps/web/src/auth/auth-context.tsx).
 * When real OIDC auth lands this is the only layer that changes.
 */

export function useInitiatives(params: ListInitiativesParams) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'list', params],
    queryFn: () => api.listInitiatives(params, devIdentity ?? undefined),
    enabled: !!devIdentity,
  });
}

export function useInitiative(id: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'detail', id],
    queryFn: () => api.getInitiative(id as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!id,
  });
}

export function useProductAreas() {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['product-areas'],
    queryFn: () => api.listProductAreas(devIdentity ?? undefined),
    enabled: !!devIdentity,
  });
}

export function useCreateInitiative() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInitiativeInput) =>
      api.createInitiative(input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['initiatives', 'list'] }),
  });
}

export function useUpdateInitiative(id: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInitiativeInput) =>
      api.updateInitiative(id, input, devIdentity ?? undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['initiatives', 'detail', id] });
      void qc.invalidateQueries({ queryKey: ['initiatives', 'list'] });
      void qc.invalidateQueries({ queryKey: ['initiatives', 'versions', id] });
      void qc.invalidateQueries({ queryKey: ['initiatives', 'activity', id] });
    },
  });
}

export function useRepositionInitiative() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RepositionInput }) =>
      api.repositionInitiative(id, input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roadmap'] }),
  });
}

export function useArchiveInitiative(id: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => api.archiveInitiative(id, version, devIdentity ?? undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['initiatives'] });
    },
  });
}

export function useBulkUpdateInitiatives() {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkUpdateInput) =>
      api.bulkUpdateInitiatives(input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['initiatives', 'list'] }),
  });
}

export function useRoadmap(params: {
  groupBy?: 'none' | 'area' | 'team';
  productAreaId?: string;
  q?: string;
}) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['roadmap', params],
    queryFn: () => api.getRoadmap(params, devIdentity ?? undefined),
    enabled: !!devIdentity,
  });
}

export function useVersions(initiativeId: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'versions', initiativeId],
    queryFn: () => api.listVersions(initiativeId as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!initiativeId,
  });
}

export function useVersionDiff(initiativeId: string | undefined, version: number | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'version-diff', initiativeId, version],
    queryFn: () =>
      api.getVersionDiff(initiativeId as string, version as number, devIdentity ?? undefined),
    enabled: !!devIdentity && !!initiativeId && version !== undefined,
  });
}

export function useActivity(initiativeId: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'activity', initiativeId],
    queryFn: () => api.getActivity(initiativeId as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!initiativeId,
  });
}

// --- RAID -----------------------------------------------------------------

export function useRaidItems(initiativeId: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'raid', initiativeId],
    queryFn: () => api.listRaidItems(initiativeId as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!initiativeId,
  });
}

export function useCreateRaidItem(initiativeId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<RaidItem, 'id' | 'initiativeId' | 'createdAt' | 'updatedAt'>) =>
      api.createRaidItem(initiativeId, input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['initiatives', 'raid', initiativeId] }),
  });
}

export function useUpdateRaidItem(initiativeId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<RaidItem> }) =>
      api.updateRaidItem(initiativeId, id, input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['initiatives', 'raid', initiativeId] }),
  });
}

// --- Milestones -------------------------------------------------------------

export function useMilestones(initiativeId: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'milestones', initiativeId],
    queryFn: () => api.listMilestones(initiativeId as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!initiativeId,
  });
}

export function useCreateMilestone(initiativeId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Milestone, 'id' | 'initiativeId' | 'createdAt' | 'updatedAt'>) =>
      api.createMilestone(initiativeId, input, devIdentity ?? undefined),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['initiatives', 'milestones', initiativeId] }),
  });
}

// --- Status updates -------------------------------------------------------------

export function useStatusUpdates(initiativeId: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'status-updates', initiativeId],
    queryFn: () => api.listStatusUpdates(initiativeId as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!initiativeId,
  });
}

export function useCreateStatusUpdate(initiativeId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.createStatusUpdate>[1]) =>
      api.createStatusUpdate(initiativeId, input, devIdentity ?? undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['initiatives', 'status-updates', initiativeId] });
      void qc.invalidateQueries({ queryKey: ['initiatives', 'activity', initiativeId] });
    },
  });
}

// --- Links --------------------------------------------------------------------

export function useLinks(initiativeId: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'links', initiativeId],
    queryFn: () => api.listLinks(initiativeId as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!initiativeId,
  });
}

export function useCreateLink(initiativeId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.createLink>[1]) =>
      api.createLink(initiativeId, input, devIdentity ?? undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['initiatives', 'links', initiativeId] }),
  });
}

// --- Comments -----------------------------------------------------------------

export function useComments(initiativeId: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'comments', initiativeId],
    queryFn: () => api.listComments(initiativeId as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!initiativeId,
  });
}

// --- Stakeholders ---------------------------------------------------------------

export function useStakeholders(initiativeId: string | undefined) {
  const { devIdentity } = useAuth();
  return useQuery({
    queryKey: ['initiatives', 'stakeholders', initiativeId],
    queryFn: () => api.listStakeholders(initiativeId as string, devIdentity ?? undefined),
    enabled: !!devIdentity && !!initiativeId,
  });
}

export function useAddStakeholder(initiativeId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.addStakeholder>[1]) =>
      api.addStakeholder(initiativeId, input, devIdentity ?? undefined),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['initiatives', 'stakeholders', initiativeId] }),
  });
}

export function useCreateComment(initiativeId: string) {
  const { devIdentity } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof api.createComment>[1]) =>
      api.createComment(initiativeId, input, devIdentity ?? undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['initiatives', 'comments', initiativeId] });
      void qc.invalidateQueries({ queryKey: ['initiatives', 'activity', initiativeId] });
    },
  });
}
