import { spawn } from 'child_process';

export interface ClaudeCliOptions {
  prompt: string;
  oauthToken: string;
  systemPrompt: string;
  model?: string;
  timeoutMs?: number;
}

export interface ClaudeCliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

/**
 * Spawn the `claude` CLI as a subprocess. Pure function — no DI, no logging,
 * just process orchestration. Tests can mock spawn.
 *
 * Flags chosen for non-interactive, deterministic-ish, side-effect-free use:
 * - `--bare`: skip ~/.claude/CLAUDE.md and project configs
 * - `--tools ""`: disable all tools (no Bash, no Read, etc.)
 * - `--output-format json`: parse the wrapper JSON envelope
 * - `--append-system-prompt-file`: inject our trading persona
 *
 * The OAuth token is passed via `CLAUDE_CODE_OAUTH_TOKEN` env so it never
 * appears on the command line.
 */
export function runClaudeCli(opts: ClaudeCliOptions): Promise<ClaudeCliResult> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const args = [
      '-p',
      opts.prompt,
      '--output-format',
      'json',
      '--tools',
      '',
      '--append-system-prompt',
      opts.systemPrompt,
      '--model',
      opts.model ?? 'claude-sonnet-4-6',
    ];

    // Strip parent ANTHROPIC_API_KEY so we don't accidentally use the host's
    // API key (we want the user's OAuth token to win).
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.ANTHROPIC_AUTH_TOKEN;
    env.CLAUDE_CODE_OAUTH_TOKEN = opts.oauthToken;

    const proc = spawn('claude', args, {
      // stdin: 'ignore' prevents claude CLI from waiting on an open pipe for
      // 3s (it inherits-as-pipe by default and reads stdin even with -p).
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
    });
    proc.stderr.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });

    const timeoutHandle = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`claude cli timed out after ${opts.timeoutMs ?? 30_000}ms`));
    }, opts.timeoutMs ?? 30_000);

    proc.on('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(err);
    });
    proc.on('close', (code) => {
      clearTimeout(timeoutHandle);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? -1,
        durationMs: Date.now() - start,
      });
    });
  });
}
