/**
 * CommentsPanel — a ticket's comments, oldest-first, with an add-comment box (REQUIREMENTS §7).
 *
 * Embedded in the ticket details view (rendered by the tickets feature). Body must be non-empty.
 * The API already returns comments in chronological (oldest-first) order.
 */
import { useState, type FormEvent } from 'react';
import { Button, EmptyState, ErrorState, Field, LoadingState, Toast } from '@/components';
import { useAuth } from '@/lib/auth';
import { useAddComment, useComments } from './api';
import './styles.css';

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export function CommentsPanel({ ticketId }: { ticketId: string }): JSX.Element {
  const { user } = useAuth();
  const commentsQuery = useComments(ticketId);
  const addMutation = useAddComment(ticketId);

  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const bodyError = submitted && !body.trim() ? 'Comment cannot be empty.' : undefined;

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    setSubmitted(true);
    if (!body.trim()) return;
    addMutation.mutate(body.trim(), {
      onSuccess: () => {
        setBody('');
        setSubmitted(false);
      },
    });
  }

  return (
    <section className="comments-panel">
      <h2 className="comments-title">Comments</h2>

      {commentsQuery.isLoading ? (
        <LoadingState label="Loading comments…" />
      ) : commentsQuery.isError ? (
        <ErrorState
          message="Could not load comments."
          onRetry={() => void commentsQuery.refetch()}
        />
      ) : (commentsQuery.data ?? []).length === 0 ? (
        <EmptyState message="No comments yet. Be the first to comment." />
      ) : (
        <ul className="comments-list">
          {(commentsQuery.data ?? []).map((comment) => (
            <li key={comment.id} className="comment-item">
              <header className="comment-meta">
                <span className="comment-author">
                  {user && comment.authorId === user.id ? user.email : comment.authorId}
                </span>
                <time className="comment-time">{formatTimestamp(comment.createdAt)}</time>
              </header>
              <p className="comment-body">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="comment-form" onSubmit={handleSubmit} noValidate>
        <Field label="Add a comment" error={bodyError}>
          <textarea
            className="ds-input comment-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Write a comment…"
          />
        </Field>
        <Button type="submit" disabled={addMutation.isPending}>
          {addMutation.isPending ? 'Posting…' : 'Add comment'}
        </Button>
        {addMutation.isError ? (
          <Toast kind="error" message={(addMutation.error as Error).message} />
        ) : null}
      </form>
    </section>
  );
}
