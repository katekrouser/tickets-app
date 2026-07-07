import { describe, expect, it } from 'vitest';
import { COLUMN_ORDER, stateLabel, typeLabel } from '@/features/board/labels';

/** Board labels + fixed five-column workflow order (REQUIREMENTS §6/§8). */
describe('board labels', () => {
  it('exposes exactly five columns in fixed workflow order', () => {
    expect(COLUMN_ORDER).toEqual([
      'new',
      'ready_for_implementation',
      'in_progress',
      'ready_for_acceptance',
      'done',
    ]);
  });

  it('renders human-readable state labels', () => {
    expect(stateLabel('ready_for_implementation')).toBe('Ready for Implementation');
    expect(stateLabel('in_progress')).toBe('In Progress');
    expect(stateLabel('done')).toBe('Done');
  });

  it('renders human-readable type labels', () => {
    expect(typeLabel('bug')).toBe('Bug');
    expect(typeLabel('feature')).toBe('Feature');
    expect(typeLabel('fix')).toBe('Fix');
  });
});
