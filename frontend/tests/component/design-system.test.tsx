import { describe, expect, it, vi } from 'vitest';

/**
 * COMPONENT tests for the frozen design-system primitives (ADR-0008 export set).
 *
 * DOM-GATED: these need a DOM test environment (jsdom/happy-dom) which is NOT yet
 * in the frozen TDR or the frontend manifest. They self-skip under the default
 * `node` environment so `npm test` stays green, and run once A9 (via a Technology
 * Change Request) adds a DOM env + sets `test.environment` to it. See A14 handoff.
 */
const hasDOM = typeof document !== 'undefined';

describe.skipIf(!hasDOM)('design-system primitives', () => {
  it('Button renders children and fires onClick', async () => {
    const { render, screen } = await import('@testing-library/react');
    const { Button } = await import('@/components');
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    btn.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('Input reflects value and reports changes', async () => {
    const { render, screen, fireEvent } = await import('@testing-library/react');
    const { Input } = await import('@/components');
    const onChange = vi.fn();
    render(<Input value="hello" onChange={onChange} />);
    const input = screen.getByDisplayValue('hello') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith('world');
  });

  it('Field shows its label and error', async () => {
    const { render, screen } = await import('@testing-library/react');
    const { Field } = await import('@/components');
    render(
      <Field label="Email" error="Required">
        <input />
      </Field>,
    );
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('Modal renders only when open, with a dialog role + close control', async () => {
    const { render, screen } = await import('@testing-library/react');
    const { Modal } = await import('@/components');
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open={false} onClose={onClose} title="Confirm">
        body
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <Modal open onClose={onClose} title="Confirm">
        body
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    screen.getByRole('button', { name: 'Close' }).click();
    expect(onClose).toHaveBeenCalled();
  });

  it('state views expose the right roles (LoadingState/EmptyState/ErrorState/Toast)', async () => {
    const { render, screen } = await import('@testing-library/react');
    const { LoadingState, EmptyState, ErrorState, Toast } = await import('@/components');
    const { unmount } = render(<LoadingState />);
    expect(screen.getByRole('status')).toBeTruthy();
    unmount();
    render(<EmptyState message="No teams yet" />);
    expect(screen.getByText('No teams yet')).toBeTruthy();
    render(<ErrorState message="Boom" />);
    expect(screen.getByRole('alert')).toBeTruthy();
    render(<Toast kind="success" message="Saved" />);
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('ErrorState retry button invokes onRetry', async () => {
    const { render, screen } = await import('@testing-library/react');
    const { ErrorState } = await import('@/components');
    const onRetry = vi.fn();
    render(<ErrorState message="Boom" onRetry={onRetry} />);
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalled();
  });
});
