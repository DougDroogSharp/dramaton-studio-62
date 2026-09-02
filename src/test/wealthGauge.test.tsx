import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WealthGauge } from '@/components/theater/WealthGauge';
import { MeterPanel, MeterRow } from '@/components/theater/MeterPanel';
import { MeterMeaning } from '@/types';

// WEALTH is one dial with two needles because HOARD and SHARED are one
// fact divided. The gap between the needles is the argument.

const meaning = (variable: string, label: string): MeterMeaning => ({
  variable, label, rising: 'goes up and that means something', falling: 'goes down and that means something',
});

const row = (variable: string, label: string, from: number, to: number, seq: number): MeterRow =>
  ({ meaning: meaning(variable, label), from, to, seq });

describe('WealthGauge', () => {
  it('describes both needles and who leads, for a listener', () => {
    const { container } = render(<WealthGauge hoard={80} shared={20} />);
    const label = container.querySelector('svg')?.getAttribute('aria-label') ?? '';
    expect(label).toContain('Hoard 80');
    expect(label).toContain('shared 20');
    expect(label).toContain('hoard leads by 60');
  });

  it('says when shared is ahead instead', () => {
    const { container } = render(<WealthGauge hoard={20} shared={70} />);
    const label = container.querySelector('svg')?.getAttribute('aria-label') ?? '';
    expect(label).toContain('Shared leads by 50');
  });

  it('draws the gap arc only when there is a gap', () => {
    const wide = render(<WealthGauge hoard={90} shared={10} />);
    // face + gap + 2 needles
    expect(wide.container.querySelectorAll('path').length).toBe(2);

    const equal = render(<WealthGauge hoard={50} shared={50} />);
    // no gap to draw: face only
    expect(equal.container.querySelectorAll('path').length).toBe(1);
  });

  it('clamps out-of-range values rather than sweeping off the dial', () => {
    // hoard is unbounded in the sim; the dial must not spin past its arc
    const { container } = render(<WealthGauge hoard={100000} shared={-50} />);
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBe(2);
    for (const l of lines) {
      for (const attr of ['x1', 'y1', 'x2', 'y2']) {
        expect(Number.isFinite(Number(l.getAttribute(attr)))).toBe(true);
      }
    }
  });
});

describe('MeterPanel wealth collapsing', () => {
  it('collapses hoard and shared into the one dial', () => {
    const { container, queryByText } = render(
      <MeterPanel rows={[
        row('hoard', 'The Hoard', 50, 62, 1),
        row('shared', 'Shared', 50, 38, 2),
        row('heat', 'Heat', 20, 30, 3),
      ]} />,
    );
    // the dial is present
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    // and hoard/shared no longer appear as their own bar rows
    expect(queryByText('The Hoard')).toBeNull();
    expect(queryByText('Shared')).toBeNull();
    // other meters still do
    expect(queryByText('Heat')).not.toBeNull();
  });

  it('leaves them as ordinary rows when only one of the pair moved', () => {
    const { container, queryByText } = render(
      <MeterPanel rows={[row('hoard', 'The Hoard', 50, 62, 1)]} />,
    );
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    expect(queryByText('The Hoard')).not.toBeNull();
  });

  it('still comments on whatever moved last, wealth included', () => {
    const { getByText } = render(
      <MeterPanel rows={[
        row('heat', 'Heat', 20, 30, 1),
        row('hoard', 'The Hoard', 50, 62, 2),
        row('shared', 'Shared', 50, 38, 3),
      ]} />,
    );
    // shared moved last (seq 3) and fell
    expect(getByText(/Shared falls/i)).toBeTruthy();
  });
});
