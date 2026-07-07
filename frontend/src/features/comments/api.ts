/**
 * @/features/comments/api — typed data layer for comments (REQUIREMENTS §7).
 *
 * Wraps the single foundation HTTP client (`@/lib/api`) with TanStack Query hooks. The API returns
 * comments oldest-first; adding a comment does NOT change the ticket's modifiedAt (server-enforced),
 * so we only invalidate the comments list.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@app/shared';
import { api } from '@/lib/api';

export type Comment = components['schemas']['Comment'];

export const commentKeys = {
  list: (ticketId: string) => ['comments', ticketId] as const,
};

function errorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

async function fetchComments(ticketId: string): Promise<Comment[]> {
  const { data, error } = await api.GET('/tickets/{ticketId}/comments', {
    params: { path: { ticketId } },
  });
  if (error || !data) throw new Error(errorMessage(error, 'Failed to load comments.'));
  return data;
}

export function useComments(ticketId: string) {
  return useQuery({
    queryKey: commentKeys.list(ticketId),
    queryFn: () => fetchComments(ticketId),
    enabled: ticketId.length > 0,
  });
}

export function useAddComment(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string): Promise<Comment> => {
      const { data, error } = await api.POST('/tickets/{ticketId}/comments', {
        params: { path: { ticketId } },
        body: { body },
      });
      if (error || !data) throw new Error(errorMessage(error, 'Failed to add comment.'));
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: commentKeys.list(ticketId) });
    },
  });
}
