import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MachineDiagram } from '@/components/theater/MachineDiagram';
import { MeterRow } from '@/components/theater/MeterPanel';

const row = (variable: string, from: number, to: number, seq: number): MeterRow => ({
  meaning: { variable, label: variable.toUpperCase(), min: 0, max: 100 } as MeterRow['meaning'],
  from, to, seq,
});

describe('the Machine diagram', () => {
  it('says nothing is moving when nothing is', () => {
    const { container } = render(<MachineDiagram rows={[]} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-label')).toMatch(/nothing moving/i);
  });

  it('names what moved and which way, for a listener', () => {
    // The diagram is the mechanism made visible. A player who cannot see
    // it must still be told what the model just did.
    const { container } = render(
      <MachineDiagram rows={[row('rent', 10, 30, 1), row('wages', 40, 22, 2)]} />
    );
    const label = container.querySelector('svg')!.getAttribute('aria-label')!;
    expect(label).toMatch(/Rent rising/);
    expect(label).toMatch(/Wages falling/);
  });

  it('ignores a variable that belongs to no node', () => {
    const { container } = render(<MachineDiagram rows={[row('plague', 0, 5, 1)]} />);
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toMatch(/nothing moving/i);
  });

  it('draws the hoard-buys-land loop', () => {
    // H -> R is the argument: a hoard buys more land, rent climbs, the
    // hoard grows. If that edge ever disappears the diagram stops making
    // George's point and becomes a flowchart.
    const { container } = render(<MachineDiagram rows={[]} />);
    expect(container.querySelectorAll('path[marker-end]').length).toBe(5);
  });

  it('reads the most recent move when a variable moves twice', () => {
    const { container } = render(
      <MachineDiagram rows={[row('rent', 10, 30, 1), row('rent', 30, 12, 2)]} />
    );
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toMatch(/Rent falling/);
  });
});

describe('the why box', () => {
  it('explains the loop above anything else', () => {
    // Hoard and rent both moving means the engine is turning, and that
    // is the sentence worth spending the box on.
    const { getByText } = render(
      <MachineDiagram rows={[row('hoard', 10, 40, 1), row('rent', 5, 20, 2), row('wages', 30, 20, 3)]} />
    );
    expect(getByText(/circle is the engine/i)).toBeTruthy();
  });

  it('says nothing when no flow is live', () => {
    // One end of an edge moving is a nudge, not a flow. Explaining it
    // would be inventing a causal claim the model did not make.
    const { container } = render(<MachineDiagram rows={[row('rent', 5, 20, 1)]} />);
    expect(container.querySelector('p')).toBeNull();
  });
});
