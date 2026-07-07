import { describe, expect, it } from 'vitest';
import type { Ticket } from '@/features/board/api';

/**
 * COMPONENT test for the board card face (A12) + a stored-XSS render check
 * (the SECURITY complement on the client): a malicious title must render as TEXT,
 * never as live DOM. DOM-GATED (see design-system.test.tsx for the gating note).
 */
const hasDOM = typeof document !== 'undefined';

const ticket: Ticket = {
  id: 't1',
  teamId: 'team1',
  type: 'feature',
  state: 'new',
  epicId: null,
  title: 'Add SSO login',
  body: 'body',
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  modifiedAt: '2026-01-01T00:00:00.000Z',
};

describe.skipIf(!hasDOM)('CardFace', () => {
  it('shows the ticket title and human-readable type label', async () => {
    const { render, screen } = await import('@testing-library/react');
    const { CardFace } = await import('@/features/board/components/TicketCard');
    render(<CardFace ticket={ticket} />);
    expect(screen.getByText('Add SSO login')).toBeTruthy();
    expect(screen.getByText('Feature')).toBeTruthy();
  });

  it('renders a stored-XSS title as inert text (no injected element)', async () => {
    const { render, container } = (await import('@testing-library/react')) as any;
    const { CardFace } = await import('@/features/board/components/TicketCard');
    const xss = '<img src=x onerror=alert(1)>';
    const { container: c } = render(<CardFace ticket={{ ...ticket, title: xss }} />);
    // React escapes text children: the payload appears as text, no <img> is created.
    expect(c.querySelector('img')).toBeNull();
    expect(c.textContent).toContain(xss);
    void container;
  });
});
