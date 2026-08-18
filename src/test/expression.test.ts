import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseExpression,
  evaluateExpression,
  evaluateExpressionSource,
  splitComparison,
  resolveSetValue,
  evaluateIfCondition,
} from '@/utils/expression';
import { parseScript, commandToString, SetCommand, IfCommand } from '@/utils/scriptParser';

const evalSrc = (src: string, vars: Record<string, string | number | boolean> = {}) =>
  evaluateExpressionSource(src, vars);

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('expression parser + evaluator', () => {
  it('evaluates arithmetic with precedence', () => {
    expect(evalSrc('2 + 3 * 4')).toBe(14);
    expect(evalSrc('(2 + 3) * 4')).toBe(20);
    expect(evalSrc('10 - 4 - 3')).toBe(3); // left associative
    expect(evalSrc('12 / 4 / 3')).toBe(1);
  });

  it('handles unary minus', () => {
    expect(evalSrc('-5')).toBe(-5);
    expect(evalSrc('3 * -2')).toBe(-6);
    expect(evalSrc('-(2 + 3)')).toBe(-5);
  });

  it('reads variables and coerces types', () => {
    expect(evalSrc('a + b', { a: 2, b: 3 })).toBe(5);
    expect(evalSrc('flag * 30', { flag: true })).toBe(30);
    expect(evalSrc('flag * 30', { flag: false })).toBe(0);
    expect(evalSrc('n + 1', { n: '41' })).toBe(42); // numeric string
  });

  it('resolves unknown variables and bad strings to 0 with a warning', () => {
    expect(evalSrc('missing + 5')).toBe(5);
    expect(evalSrc('s * 2', { s: 'hello' })).toBe(0);
    expect(console.warn).toHaveBeenCalled();
  });

  it('division by zero resolves to 0, not Infinity', () => {
    expect(evalSrc('5 / 0')).toBe(0);
  });

  it('supports the function set', () => {
    expect(evalSrc('clamp(150, 0, 100)')).toBe(100);
    expect(evalSrc('clamp(-10, 0, 100)')).toBe(0);
    expect(evalSrc('clamp(50, 0, 100)')).toBe(50);
    expect(evalSrc('min(3, 1, 2)')).toBe(1);
    expect(evalSrc('max(3, 1, 2)')).toBe(3);
    expect(evalSrc('abs(-7)')).toBe(7);
    expect(evalSrc('floor(3.9)')).toBe(3);
    const r = evalSrc('rand()');
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);
  });

  it('evaluates the Georgist margin formula', () => {
    const vars = { speculation: 40, greed: 50, regulation: 20, singleTax: false };
    // 100 - 40*0.5 - 50*0.3 + 20*0.2 + 0*30 = 100 - 20 - 15 + 4 = 69
    expect(
      evalSrc('clamp(100 - speculation * 0.5 - greed * 0.3 + regulation * 0.2 + singleTax * 30, 5, 100)', vars),
    ).toBeCloseTo(69);
  });

  it('rejects non-expressions', () => {
    expect(parseExpression('hello world')).toBeNull();
    expect(parseExpression('2 +')).toBeNull();
    expect(parseExpression('(2 + 3')).toBeNull();
    expect(parseExpression('"quoted"')).toBeNull();
    expect(parseExpression('')).toBeNull();
  });

  it('unknown function resolves to 0 with a warning', () => {
    expect(evalSrc('sqrt(4)')).toBe(0);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('splitComparison', () => {
  it('splits at a top-level comparison operator', () => {
    expect(splitComparison('wages + 5 > rent * 2')).toEqual({ lhs: 'wages + 5', op: '>', rhs: 'rent * 2' });
    expect(splitComparison('a >= b')).toEqual({ lhs: 'a', op: '>=', rhs: 'b' });
    expect(splitComparison('a == b')).toEqual({ lhs: 'a', op: '==', rhs: 'b' });
  });

  it('ignores operators inside parentheses', () => {
    expect(splitComparison('clamp(a, 0, 100) < 50')).toEqual({ lhs: 'clamp(a, 0, 100)', op: '<', rhs: '50' });
  });

  it('returns null when there is no comparison', () => {
    expect(splitComparison('a + b')).toBeNull();
  });
});

describe('SET with expressions', () => {
  it('keeps literal SET byte-compatible', () => {
    const cmds = parseScript('[SET hasKey = true]\n[SET count = 3]\n[SET name = "Alex"]');
    expect(cmds).toHaveLength(3);
    expect((cmds[0] as SetCommand).value).toBe(true);
    expect((cmds[1] as SetCommand).value).toBe(3);
    expect((cmds[2] as SetCommand).value).toBe('Alex');
    expect((cmds[0] as SetCommand).isExpression).toBeUndefined();
  });

  it('keeps bare-word strings working (legacy)', () => {
    const cmd = parseScript('[SET mood = grim]')[0] as SetCommand;
    expect(resolveSetValue(cmd, {})).toBe('grim');
  });

  it('copies a variable when a bare identifier names one', () => {
    const cmd = parseScript('[SET x = wages]')[0] as SetCommand;
    expect(resolveSetValue(cmd, { wages: 55 })).toBe(55);
  });

  it('evaluates arithmetic expressions against world state', () => {
    const cmd = parseScript('[SET product = laborForce * productivity]')[0] as SetCommand;
    expect(cmd.isExpression).toBe(true);
    expect(resolveSetValue(cmd, { laborForce: 10, productivity: 3 })).toBe(30);
  });

  it('evaluates function calls', () => {
    const cmd = parseScript('[SET rent = clamp(product * 2, 0, 100)]')[0] as SetCommand;
    expect(resolveSetValue(cmd, { product: 80 })).toBe(100);
  });

  it('multi-word non-expressions stay plain strings', () => {
    const cmd = parseScript('[SET title = Grand Hotel]')[0] as SetCommand;
    expect(cmd.isExpression).toBeUndefined();
    expect(resolveSetValue(cmd, {})).toBe('Grand Hotel');
  });

  it('round-trips expression SET through the serializer', () => {
    const src = '[SET product = laborForce * productivity]';
    const cmd = parseScript(src)[0] as SetCommand;
    expect(commandToString(cmd)).toBe(src);
    // and the serialized form parses back identically
    const reparsed = parseScript(commandToString(cmd))[0] as SetCommand;
    expect(reparsed).toEqual(cmd);
  });
});

describe('IF with expressions', () => {
  it('keeps the simple form working', () => {
    const cmd = parseScript('[IF hasKey == true]\n[ENDIF]')[0] as IfCommand;
    expect(cmd.isExpression).toBeUndefined();
    expect(evaluateIfCondition(cmd, { hasKey: true })).toBe(true);
    expect(evaluateIfCondition(cmd, { hasKey: false })).toBe(false);
  });

  it('keeps string comparison working', () => {
    const cmd = parseScript('[IF name == "Alex"]\n[ENDIF]')[0] as IfCommand;
    expect(evaluateIfCondition(cmd, { name: 'Alex' })).toBe(true);
    expect(evaluateIfCondition(cmd, { name: 'Sam' })).toBe(false);
  });

  it('resolves a bare-identifier RHS as a variable when one exists', () => {
    const cmd = parseScript('[IF wages > minWage]\n[ENDIF]')[0] as IfCommand;
    expect(evaluateIfCondition(cmd, { wages: 50, minWage: 30 })).toBe(true);
    expect(evaluateIfCondition(cmd, { wages: 20, minWage: 30 })).toBe(false);
  });

  it('handles an expression RHS', () => {
    const cmd = parseScript('[IF wages > rent * 2]\n[ENDIF]')[0] as IfCommand;
    expect(cmd.isExpression).toBe(true);
    expect(evaluateIfCondition(cmd, { wages: 50, rent: 20 })).toBe(true);
    expect(evaluateIfCondition(cmd, { wages: 30, rent: 20 })).toBe(false);
  });

  it('handles an expression LHS', () => {
    const cmd = parseScript('[IF wages + bonus > 100]\n[ENDIF]')[0] as IfCommand;
    expect(cmd.isExpression).toBe(true);
    expect(evaluateIfCondition(cmd, { wages: 80, bonus: 30 })).toBe(true);
    expect(evaluateIfCondition(cmd, { wages: 80, bonus: 10 })).toBe(false);
  });

  it('round-trips expression IF through the serializer', () => {
    const src = '[IF wages + 5 > rent * 2]';
    const cmd = parseScript(`${src}\nNarrator: "hello"\n[ENDIF]`)[0] as IfCommand;
    const out = commandToString(cmd);
    expect(out.startsWith('[IF wages + 5 > rent * 2]')).toBe(true);
    const reparsed = parseScript(out)[0] as IfCommand;
    expect(reparsed.variable).toBe(cmd.variable);
    expect(reparsed.operator).toBe(cmd.operator);
    expect(reparsed.value).toBe(cmd.value);
  });

  it('nests commands inside expression IF like the simple form', () => {
    const cmds = parseScript('[IF a * 2 > 4]\n[SET b = 1]\n[ENDIF]');
    expect(cmds).toHaveLength(1);
    expect((cmds[0] as IfCommand).commands).toHaveLength(1);
  });
});
