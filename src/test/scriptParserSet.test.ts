import { describe, it, expect } from 'vitest';
import {
  parseScript,
  commandToString,
  SetCommand,
  ChoiceCommand,
} from '../utils/scriptParser';

describe('SET with += / -=', () => {
  it('parses plain assignment without an op field (back-compat)', () => {
    const [cmd] = parseScript('[SET hasKey = true]') as SetCommand[];
    expect(cmd).toMatchObject({ type: 'SET', variable: 'hasKey', value: true });
    expect(cmd.op).toBeUndefined();
  });

  it('parses increment and decrement', () => {
    const cmds = parseScript('[SET boss_rep += 10]\n[SET cash -= 50]') as SetCommand[];
    expect(cmds[0]).toMatchObject({ type: 'SET', variable: 'boss_rep', op: '+=', value: 10 });
    expect(cmds[1]).toMatchObject({ type: 'SET', variable: 'cash', op: '-=', value: 50 });
  });

  it('round-trips through commandToString', () => {
    for (const line of ['[SET boss_rep += 10]', '[SET cash -= 50]', '[SET hasKey = true]', '[SET name = "Alex"]']) {
      const [cmd] = parseScript(line);
      expect(commandToString(cmd)).toBe(line);
    }
  });
});

describe('CHOICE options with inline sets (decision points)', () => {
  const script = [
    '[CHOICE]',
    '- "Walk away" -> street',
    '- "Bribe the guard" -> hallway [SET guard_trust += 10] [SET cash -= 50]',
    '[/CHOICE]',
  ].join('\n');

  it('parses plain options without an effects field', () => {
    const [choice] = parseScript(script) as ChoiceCommand[];
    expect(choice.type).toBe('CHOICE');
    expect(choice.options[0]).toEqual({ text: 'Walk away', target: 'street' });
  });

  it('parses inline effects on an option', () => {
    const [choice] = parseScript(script) as ChoiceCommand[];
    const bribe = choice.options[1];
    expect(bribe.target).toBe('hallway');
    expect(bribe.effects).toHaveLength(2);
    expect(bribe.effects![0]).toMatchObject({ variable: 'guard_trust', op: '+=', value: 10 });
    expect(bribe.effects![1]).toMatchObject({ variable: 'cash', op: '-=', value: 50 });
  });

  it('round-trips the whole block', () => {
    const [choice] = parseScript(script);
    expect(commandToString(choice)).toBe(script);
  });
});
