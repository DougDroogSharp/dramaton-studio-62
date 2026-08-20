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
    expect(label).toMatch(/RENT rising/);
    expect(label).toMatch(/WAGES falling/);
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
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toMatch(/RENT falling/);
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

describe('every node is a gauge', () => {
  it('reads its own live value and says it aloud', () => {
    // Doug: "Every node is a guage and is labelled." A node that only
    // lit up said something changed but never how much.
    const { container } = render(
      <MachineDiagram
        rows={[row('rent', 10, 40, 1)]}
        worldState={{ rent: 40, hoard: 12, wages: 25, shared: 25, land: 60 }}
      />
    );
    const label = container.querySelector('svg')!.getAttribute('aria-label')!;
    expect(label).toMatch(/RENT rising, now 40/);
  });

  it('labels every node, moved or not', () => {
    const { getByText } = render(<MachineDiagram rows={[]} worldState={{}} />);
    for (const name of ['LAND', 'RENT', 'HOARD', 'WAGES', 'SHARED']) {
      expect(getByText(name), `${name} has no label`).toBeTruthy();
    }
  });

  it('draws no needle for a variable the game does not track', () => {
    // A dial with no reading must show an empty face rather than a
    // needle pinned at zero, which would be a claim the model never made.
    const { container } = render(<MachineDiagram rows={[]} worldState={{}} />);
    expect(container.querySelectorAll('line').length).toBe(0);
  });

  it('pins rather than spins when a value runs past its scale', () => {
    // hoard is unbounded in the model but the dial is 0-100.
    const { container } = render(
      <MachineDiagram rows={[]} worldState={{ hoard: 999999 }} />
    );
    expect(container.querySelectorAll('line').length).toBe(1);
  });
});
