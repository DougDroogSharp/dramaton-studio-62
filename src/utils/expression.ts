// DRAM Script expression evaluator
// Grammar: + - * / ( ), numeric literals, variable identifiers, and a
// tiny function set: clamp(x,min,max), min(...), max(...), abs(x),
// floor(x), rand().
//
// Fail soft, always: a bad expression parses to null and evaluates to 0
// with a console warning. Script errors must never crash the theater.

export type WorldVars = Record<string, string | number | boolean>;

export type ExprNode =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'unary'; op: '-'; operand: ExprNode }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/'; left: ExprNode; right: ExprNode }
  | { kind: 'call'; name: string; args: ExprNode[] };

// ============ WARNINGS (deduped so a 500ms TICK can't flood the console) ============

const warned = new Set<string>();

export function warnOnce(msg: string) {
  if (warned.has(msg)) return;
  if (warned.size > 200) warned.clear();
  warned.add(msg);
  console.warn(`[DramScript] ${msg}`);
}

// ============ TOKENIZER ============

type Token =
  | { t: 'num'; v: number }
  | { t: 'ident'; v: string }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '(' | ')' | ',' };

function tokenize(src: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      const m = src.slice(i).match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
      if (!m) return null;
      tokens.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = src.slice(i).match(/^[A-Za-z_]\w*/);
      if (!m) return null;
      tokens.push({ t: 'ident', v: m[0] });
      i += m[0].length;
      continue;
    }
    if ('+-*/(),'.includes(ch)) {
      tokens.push({ t: 'op', v: ch as '+' | '-' | '*' | '/' | '(' | ')' | ',' });
      i++;
      continue;
    }
    return null; // unrecognized character: not an expression
  }
  return tokens;
}

// ============ PARSER (recursive descent) ============

const FUNCTION_NAMES = new Set(['clamp', 'min', 'max', 'abs', 'floor', 'rand']);

function parseTokens(tokens: Token[]): ExprNode | null {
  let pos = 0;

  const peek = () => tokens[pos];
  const takeOp = (v: string): boolean => {
    const tk = tokens[pos];
    if (tk && tk.t === 'op' && tk.v === v) { pos++; return true; }
    return false;
  };

  function parseAdditive(): ExprNode | null {
    let left = parseMultiplicative();
    if (!left) return null;
    for (;;) {
      const tk = peek();
      if (tk && tk.t === 'op' && (tk.v === '+' || tk.v === '-')) {
        pos++;
        const right = parseMultiplicative();
        if (!right) return null;
        left = { kind: 'binary', op: tk.v, left, right };
      } else {
        return left;
      }
    }
  }

  function parseMultiplicative(): ExprNode | null {
    let left = parseUnary();
    if (!left) return null;
    for (;;) {
      const tk = peek();
      if (tk && tk.t === 'op' && (tk.v === '*' || tk.v === '/')) {
        pos++;
        const right = parseUnary();
        if (!right) return null;
        left = { kind: 'binary', op: tk.v, left, right };
      } else {
        return left;
      }
    }
  }

  function parseUnary(): ExprNode | null {
    if (takeOp('-')) {
      const operand = parseUnary();
      if (!operand) return null;
      return { kind: 'unary', op: '-', operand };
    }
    return parsePrimary();
  }

  function parsePrimary(): ExprNode | null {
    const tk = peek();
    if (!tk) return null;
    if (tk.t === 'num') { pos++; return { kind: 'num', value: tk.v }; }
    if (tk.t === 'ident') {
      pos++;
      if (takeOp('(')) {
        // Function call
        const args: ExprNode[] = [];
        if (!takeOp(')')) {
          for (;;) {
            const arg = parseAdditive();
            if (!arg) return null;
            args.push(arg);
            if (takeOp(')')) break;
            if (!takeOp(',')) return null;
          }
        }
        return { kind: 'call', name: tk.v, args };
      }
      return { kind: 'var', name: tk.v };
    }
    if (takeOp('(')) {
      const inner = parseAdditive();
      if (!inner) return null;
      if (!takeOp(')')) return null;
      return inner;
    }
    return null;
  }

  const node = parseAdditive();
  if (!node) return null;
  if (pos !== tokens.length) return null; // trailing junk: not an expression
  return node;
}

// Parse cache: expressions are stored as source text on commands and
// re-evaluated every tick, so avoid re-parsing hot strings.
const parseCache = new Map<string, ExprNode | null>();

export function parseExpression(src: string): ExprNode | null {
  const key = src.trim();
  if (key === '') return null;
  if (parseCache.has(key)) return parseCache.get(key)!;
  if (parseCache.size > 500) parseCache.clear();
  const tokens = tokenize(key);
  const node = tokens ? parseTokens(tokens) : null;
  parseCache.set(key, node);
  return node;
}

export function isBareIdentifier(node: ExprNode): node is { kind: 'var'; name: string } {
  return node.kind === 'var';
}

// ============ EVALUATOR ============

function toNumber(v: string | number | boolean | undefined, context: string): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'string') {
    const n = Number(v);
    if (v.trim() !== '' && Number.isFinite(n)) return n;
    warnOnce(`${context} is the non-numeric string "${v}"; using 0`);
    return 0;
  }
  warnOnce(`${context} is not defined; using 0`);
  return 0;
}

function callFunction(name: string, args: number[]): number {
  switch (name) {
    case 'clamp': {
      if (args.length !== 3) { warnOnce(`clamp() takes 3 arguments, got ${args.length}; using 0`); return 0; }
      const [x, lo, hi] = args;
      return Math.min(hi, Math.max(lo, x));
    }
    case 'min':
      if (args.length === 0) { warnOnce('min() needs at least 1 argument; using 0'); return 0; }
      return Math.min(...args);
    case 'max':
      if (args.length === 0) { warnOnce('max() needs at least 1 argument; using 0'); return 0; }
      return Math.max(...args);
    case 'abs':
      if (args.length !== 1) { warnOnce(`abs() takes 1 argument, got ${args.length}; using 0`); return 0; }
      return Math.abs(args[0]);
    case 'floor':
      if (args.length !== 1) { warnOnce(`floor() takes 1 argument, got ${args.length}; using 0`); return 0; }
      return Math.floor(args[0]);
    case 'rand':
      // rand() -> [0,1); rand(max) -> [0,max); rand(min,max) -> [min,max)
      if (args.length === 0) return Math.random();
      if (args.length === 1) return Math.random() * args[0];
      if (args.length === 2) return args[0] + Math.random() * (args[1] - args[0]);
      warnOnce(`rand() takes 0-2 arguments, got ${args.length}; using rand(min,max)`);
      return args[0] + Math.random() * (args[1] - args[0]);
    default:
      warnOnce(`unknown function ${name}(); using 0`);
      return 0;
  }
}

export function evaluateExpression(node: ExprNode, vars: WorldVars): number {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'var':
      return toNumber(vars[node.name], `variable "${node.name}"`);
    case 'unary':
      return -evaluateExpression(node.operand, vars);
    case 'binary': {
      const l = evaluateExpression(node.left, vars);
      const r = evaluateExpression(node.right, vars);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
          if (r === 0) { warnOnce('division by zero; using 0'); return 0; }
          return l / r;
      }
      return 0;
    }
    case 'call':
      if (!FUNCTION_NAMES.has(node.name)) { warnOnce(`unknown function ${node.name}(); using 0`); return 0; }
      return callFunction(node.name, node.args.map(a => evaluateExpression(a, vars)));
  }
}

export function evaluateExpressionSource(src: string, vars: WorldVars): number {
  const node = parseExpression(src);
  if (!node) {
    warnOnce(`could not parse expression "${src}"; using 0`);
    return 0;
  }
  return evaluateExpression(node, vars);
}

// ============ IF-CONDITION SPLITTING ============

// Find a top-level comparison operator (outside parentheses) so
// [IF wages + 5 > rent * 2] can be split into lhs/op/rhs.
export function splitComparison(src: string): { lhs: string; op: string; rhs: string } | null {
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0) {
      const two = src.slice(i, i + 2);
      if (two === '==' || two === '!=' || two === '>=' || two === '<=') {
        return { lhs: src.slice(0, i).trim(), op: two, rhs: src.slice(i + 2).trim() };
      }
      if (ch === '>' || ch === '<') {
        return { lhs: src.slice(0, i).trim(), op: ch, rhs: src.slice(i + 1).trim() };
      }
    }
  }
  return null;
}

// ============ COMMAND-LEVEL HELPERS ============
// Structural parameter types so this module needs no imports from the parser.

const BARE_IDENT = /^[A-Za-z_]\w*$/;

// Resolve the runtime value of a SET command.
// isExpression covers both complex expressions and bare identifiers; a
// bare identifier copies the named variable when it exists and falls
// back to the legacy plain-string behavior when it doesn't.
export function resolveSetValue(
  cmd: { variable: string; value: string | number | boolean; isExpression?: boolean },
  vars: WorldVars,
): string | number | boolean {
  if (!cmd.isExpression) return cmd.value;
  const src = String(cmd.value);
  const node = parseExpression(src);
  if (!node) {
    warnOnce(`could not parse expression "${src}" in SET ${cmd.variable}; using 0`);
    return 0;
  }
  if (node.kind === 'var') {
    if (node.name in vars) return vars[node.name];
    return src; // legacy: [SET name = Alex] stores the string "Alex"
  }
  return evaluateExpression(node, vars);
}

// Resolve a raw value string with SET semantics: literal fast-paths,
// bare identifier copies a variable when one exists, otherwise
// arithmetic expression (bad input falls back to the raw string).
// Used by button effects and other data-driven variable writes.
export function resolveValueString(raw: string, vars: WorldVars): string | number | boolean {
  const t = raw.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t !== '' && !isNaN(Number(t))) return Number(t);
  if (/^["'].*["']$/.test(t)) return t.replace(/^["']|["']$/g, '');
  const node = parseExpression(t);
  if (!node) return t;
  if (node.kind === 'var') return node.name in vars ? vars[node.name] : t;
  return evaluateExpression(node, vars);
}

// Evaluate an IF condition against the world state.
// isExpression means both sides are expression source text (numeric
// comparison). The legacy form keeps its exact semantics, with one
// extension: a bare-identifier RHS that names an existing variable
// resolves to that variable's value.
export function evaluateIfCondition(
  cmd: { variable: string; operator: string; value: string | number | boolean; isExpression?: boolean },
  vars: WorldVars,
): boolean {
  if (cmd.isExpression) {
    const l = evaluateExpressionSource(cmd.variable, vars);
    const r = evaluateExpressionSource(String(cmd.value), vars);
    switch (cmd.operator) {
      case '==': return l === r;
      case '!=': return l !== r;
      case '>': return l > r;
      case '<': return l < r;
      case '>=': return l >= r;
      case '<=': return l <= r;
    }
    return false;
  }

  const varValue = vars[cmd.variable];
  let cmpValue = cmd.value;
  if (typeof cmpValue === 'string' && BARE_IDENT.test(cmpValue) && cmpValue in vars) {
    cmpValue = vars[cmpValue];
  }
  switch (cmd.operator) {
    case '==': return varValue === cmpValue;
    case '!=': return varValue !== cmpValue;
    case '>': return Number(varValue) > Number(cmpValue);
    case '<': return Number(varValue) < Number(cmpValue);
    case '>=': return Number(varValue) >= Number(cmpValue);
    case '<=': return Number(varValue) <= Number(cmpValue);
  }
  return false;
}
