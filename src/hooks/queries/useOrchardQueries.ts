import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import {
  fetchOrchard,
  fetchOrchardsList,
  fetchOrchardByIdWithSession,
  type OrchardFilters,
} from '@/api/orchards';

/**
 * React Query wrappers around the orchards data-access layer.
 *
 * Pure additions — they don't replace `useOrchards`; they sit alongside it.
 * Use these in new code (or migrate pages incrementally) to get caching,
 * request dedup, and background refresh for free.
 *
 * Defaults inherit from the project queryClient (src/lib/queryPersistence.ts).
 */

export const orchardQueryKeys = {
  all: ['orchards'] as const,
  list: (filters: OrchardFilters = {}) =>
    [...orchardQueryKeys.all, 'list', filters] as const,
  detail: (id: string) => [...orchardQueryKeys.all, 'detail', id] as const,
  detailWithSession: (id: string) =>
    [...orchardQueryKeys.all, 'detailWithSession', id] as const,
};

type OrchardRow = Awaited<ReturnType<typeof fetchOrchard>>;
type OrchardList = Awaited<ReturnType<typeof fetchOrchardsList>>;
type OrchardWithSession = Awaited<ReturnType<typeof fetchOrchardByIdWithSession>>;

/**
 * Fetch a single active orchard. Throws on error / not-found.
 * Suitable for public read paths (no session check).
 */
export function useOrchardQuery(
  orchardId: string | undefined,
  options?: Omit<UseQueryOptions<OrchardRow>, 'queryKey' | 'queryFn' | 'enabled'> & {
    enabled?: boolean;
  }
) {
  return useQuery<OrchardRow>({
    queryKey: orchardQueryKeys.detail(orchardId || ''),
    queryFn: () => fetchOrchard(orchardId as string),
    enabled: !!orchardId && (options?.enabled ?? true),
    ...options,
  });
}

/**
 * Fetch list of active orchards with optional filters.
 */
export function useOrchardsListQuery(
  filters: OrchardFilters = {},
  options?: Omit<UseQueryOptions<OrchardList>, 'queryKey' | 'queryFn'>
) {
  return useQuery<OrchardList>({
    queryKey: orchardQueryKeys.list(filters),
    queryFn: () => fetchOrchardsList(filters),
    ...options,
  });
}

/**
 * Authenticated single-orchard fetch with session check and best-effort
 * view-count increment. Returns null when not found / not accessible.
 * Mirrors useOrchards.fetchOrchardById behavior, but cached + dedup'd.
 */
export function useOrchardByIdWithSessionQuery(
  orchardId: string | undefined,
  options?: Omit<UseQueryOptions<OrchardWithSession>, 'queryKey' | 'queryFn' | 'enabled'> & {
    enabled?: boolean;
  }
) {
  return useQuery<OrchardWithSession>({
    queryKey: orchardQueryKeys.detailWithSession(orchardId || ''),
    queryFn: () => fetchOrchardByIdWithSession(orchardId as string),
    enabled: !!orchardId && (options?.enabled ?? true),
    // View-count increment is a side effect — don't refetch on focus by default.
    refetchOnWindowFocus: false,
    ...options,
  });
}
