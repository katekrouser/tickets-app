/**
 * @/components — design-system primitives + shared state views (ADR-0008, EXACT export set).
 *
 * Frozen export set with the frozen prop signatures:
 *   Button, Input, Field, Modal, Toast, LoadingState, EmptyState, ErrorState
 *
 * Additions are additive; renames/removals/prop-signature changes require a superseding ADR.
 * Styling uses class names defined in @/app/styles.css (imported once by main.tsx).
 */
import type { ReactNode } from 'react';

export function Button(p: {
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <button
      className="ds-button"
      type={p.type ?? 'button'}
      disabled={p.disabled}
      onClick={p.onClick}
    >
      {p.children}
    </button>
  );
}

export function Input(p: {
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'password' | 'email';
  placeholder?: string;
}): JSX.Element {
  return (
    <input
      className="ds-input"
      type={p.type ?? 'text'}
      value={p.value}
      placeholder={p.placeholder}
      onChange={(e) => p.onChange(e.target.value)}
    />
  );
}

export function Field(p: { label: string; error?: string; children: ReactNode }): JSX.Element {
  return (
    <label className="ds-field">
      <span className="ds-field-label">{p.label}</span>
      {p.children}
      {p.error ? <span className="ds-field-error">{p.error}</span> : null}
    </label>
  );
}

export function Modal(p: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}): JSX.Element {
  if (!p.open) return <></>;
  return (
    <div className="ds-modal-overlay" role="presentation" onClick={p.onClose}>
      <div
        className="ds-modal"
        role="dialog"
        aria-modal="true"
        aria-label={p.title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ds-modal-header">
          <h2 className="ds-modal-title">{p.title}</h2>
          <button className="ds-modal-close" type="button" aria-label="Close" onClick={p.onClose}>
            ×
          </button>
        </header>
        <div className="ds-modal-body">{p.children}</div>
      </div>
    </div>
  );
}

export function Toast(p: { kind: 'success' | 'error'; message: string }): JSX.Element {
  return (
    <div className={`ds-toast ds-toast--${p.kind}`} role="status" aria-live="polite">
      {p.message}
    </div>
  );
}

export function LoadingState(p: { label?: string }): JSX.Element {
  return (
    <div className="ds-state ds-state--loading" role="status" aria-live="polite">
      <span className="ds-spinner" aria-hidden="true" />
      <span>{p.label ?? 'Loading…'}</span>
    </div>
  );
}

export function EmptyState(p: { message: string }): JSX.Element {
  return (
    <div className="ds-state ds-state--empty">
      <p>{p.message}</p>
    </div>
  );
}

export function ErrorState(p: { message: string; onRetry?: () => void }): JSX.Element {
  return (
    <div className="ds-state ds-state--error" role="alert">
      <p>{p.message}</p>
      {p.onRetry ? <Button onClick={p.onRetry}>Retry</Button> : null}
    </div>
  );
}
