// PreToolUse guard for Bash / PowerShell.
//
// Prefix permission rules can only match the START of a command, so they cannot
// catch a dangerous flag appended to an otherwise-allowed command
// (`git push origin main --force`) or a destructive verb in the middle of a
// compound line. This guard reads the whole command string and:
//
//   - forces a prompt ("ask") on destructive patterns anywhere in the command,
//     even when an allow rule matched;
//   - auto-allows curl / Invoke-WebRequest when every URL is on localhost
//     (smoke checks), since a prefix rule can't see a URL mid-command.
//
// Anything else: stays silent and lets the normal allow/ask/deny rules decide.
// Any error at all: exits 0 silently, so a bug here can never wedge a session.

const LOCAL_HOSTS = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]', '10.0.0.137',
]);

// Destructive-but-sometimes-legitimate: stop and ask Doug.
const ASK_PATTERNS = [
  [/\brm\s+(-[a-z]*\s+)*-?[a-z]*[rf]/i, 'rm with -r/-f'],
  [/\b(remove-item|rmdir|rd)\b/i, 'directory/item removal'],
  [/\bdel\s+\/[sqf]/i, 'del /s /q'],
  [/\bgit\s+push\b[^\n]*(--force|--mirror|\s-f\b)/i, 'force push'],
  [/\bgit\s+reset\b[^\n]*--hard/i, 'git reset --hard'],
  [/\bgit\s+clean\b[^\n]*-[a-z]*[fx]/i, 'git clean -f'],
  [/\bgit\s+(branch|tag)\s+-D\b/, 'force-delete branch/tag'],
  [/\bgit\s+checkout\s+(--\s|\.\s*$)/, 'git checkout -- (discards work)'],
  [/\bgit\s+(restore|stash\s+(drop|clear))\b/i, 'discards working-tree changes'],
  [/\bgit\s+(filter-branch|reflog\s+(delete|expire))\b/i, 'history rewrite'],
  [/\bgit\s+update-ref\s+-d\b/i, 'ref deletion'],
  [/\b(npm|pnpm|yarn)\s+\S+[^\n]*\s(-g|--global)\b/i, 'global package install'],
  [/\byarn\s+global\b/i, 'global package install'],
  [/\bnpm\s+publish\b/i, 'npm publish'],
  [/\b(pip3?|pipx)\s+install\b/i, 'pip install'],
  [/\bpython3?\s+-m\s+pip\s+install\b/i, 'pip install'],
  [/\|\s*(sudo\s+)?(sh|bash|zsh|iex|invoke-expression)\b/i, 'pipes network output into a shell'],
  [/\b(invoke-expression|iex)\s/i, 'Invoke-Expression'],
  [/\bsudo\b/i, 'sudo'],
  [/\b(stop-computer|restart-computer|shutdown)\b/i, 'shutdown/restart'],
  [/\bset-executionpolicy\b/i, 'execution policy change'],
  // NOTE: must not match the *word* "format" — it appears in safe commands
  // (`Get-Date -Format`, `Format-Table`, `git log --format=`). Only match the
  // disk tools: `format c:` / `format.com d:`, Format-Volume, Clear-Disk, etc.
  [/\bformat(\.com)?\s+[a-z]:|\b(format-volume|clear-disk|initialize-disk|remove-partition|diskpart|mkfs|fsutil)\b/i, 'disk-level operation'],
];

const FETCHERS = /^(curl|wget|invoke-webrequest|iwr|invoke-restmethod|irm)\b/i;

function decide(cmd) {
  for (const [re, why] of ASK_PATTERNS) {
    if (re.test(cmd)) return { permissionDecision: 'ask', reason: `Guard: ${why} — confirm before running.` };
  }

  // localhost-only smoke checks are safe to run unattended.
  const head = cmd.trim().split(/\s+/)[0] ?? '';
  if (FETCHERS.test(head)) {
    const urls = cmd.match(/https?:\/\/[^\s'"`)|;]+/gi) ?? [];
    if (urls.length === 0) return null;
    const allLocal = urls.every((u) => {
      try { return LOCAL_HOSTS.has(new URL(u).hostname.toLowerCase()); } catch { return false; }
    });
    if (allLocal) return { permissionDecision: 'allow', reason: 'Guard: localhost-only request.' };
  }
  return null;
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  try {
    const cmd = JSON.parse(raw)?.tool_input?.command;
    if (typeof cmd !== 'string' || !cmd) return;
    const verdict = decide(cmd);
    if (!verdict) return;
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: verdict.permissionDecision,
        permissionDecisionReason: verdict.reason,
      },
    }));
  } catch {
    // fail open — the allow/ask/deny rules still apply
  }
});
