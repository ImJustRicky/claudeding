import { playSound } from '../lib/audio.js';
import { showNotification } from '../lib/notify.js';
import { basename } from 'path';
import { appendFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DEBUG_LOG = join(homedir(), '.claudeding-debug.log');

function debugLog(message) {
  if (!process.env.CLAUDEDING_DEBUG) return;
  const timestamp = new Date().toISOString();
  try {
    appendFileSync(DEBUG_LOG, `[${timestamp}] ${message}\n`);
  } catch {
    // Ignore write errors
  }
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';

    if (process.stdin.isTTY) {
      debugLog('stdin is TTY, no data');
      resolve(null);
      return;
    }

    process.stdin.setEncoding('utf8');

    const timeout = setTimeout(() => {
      debugLog(`stdin timeout, data so far: ${data || '(empty)'}`);
      resolve(data || null);
    }, 500);

    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });

    process.stdin.on('end', () => {
      clearTimeout(timeout);
      debugLog(`stdin end, data: ${data || '(empty)'}`);
      resolve(data || null);
    });
  });
}

function parseContext(stdinData) {
  if (!stdinData) return {};

  try {
    const parsed = JSON.parse(stdinData);
    debugLog(`parsed context: ${JSON.stringify(parsed)}`);
    return parsed;
  } catch (e) {
    debugLog(`parse error: ${e.message}, raw: ${stdinData}`);
    return {};
  }
}

function getProjectName(context) {
  // Try stdin context fields
  let cwd = context.cwd || context.workingDirectory || context.working_directory;

  // Try environment variables Claude Code might set
  if (!cwd) {
    cwd = process.env.CLAUDE_CWD ||
          process.env.CLAUDE_WORKING_DIR ||
          process.env.CLAUDE_PROJECT_DIR ||
          process.env.PWD;
  }

  debugLog(`cwd resolved: ${cwd}`);
  if (!cwd) return null;
  return basename(cwd);
}

export default async function play(event, options) {
  // Log all CLAUDE_ env vars for debugging
  const claudeEnvVars = Object.entries(process.env)
    .filter(([k]) => k.startsWith('CLAUDE'))
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  debugLog(`CLAUDE env vars: ${claudeEnvVars || '(none)'}`);
  debugLog(`PWD: ${process.env.PWD}`);

  const validEvents = ['complete', 'feedback', 'error'];

  if (!validEvents.includes(event)) {
    console.error(`Error: Invalid event "${event}". Use "complete", "feedback", or "error".`);
    process.exit(1);
  }

  // Read context from stdin (Claude Code passes hook context as JSON)
  const stdinData = await readStdin();
  const context = parseContext(stdinData);
  const projectName = getProjectName(context);

  // Play sound and show notification in parallel
  await Promise.all([
    playSound(event, null, { force: options?.force }),
    showNotification(event, projectName)
  ]);
}
