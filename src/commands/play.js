import { playSound } from '../lib/audio.js';
import { showNotification } from '../lib/notify.js';
import { loadConfig } from '../lib/config.js';
import { basename } from 'path';
import { appendFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DEBUG_LOG = join(homedir(), '.claudeding-debug.log');
const LAST_EVENT_FILE = join(homedir(), '.claudeding-lastevent');
const HISTORY_FILE = join(homedir(), '.claudeding-history.jsonl');

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

  const validEvents = ['complete', 'feedback', 'error', 'thinking'];

  if (!validEvents.includes(event)) {
    console.error(`Error: Invalid event "${event}". Use "complete", "feedback", "error", or "thinking".`);
    process.exit(1);
  }

  // Read context from stdin (Claude Code passes hook context as JSON)
  const stdinData = await readStdin();
  const context = parseContext(stdinData);
  const projectName = getProjectName(context);

  // Get project directory for per-project config
  const projectDir = context.cwd || context.workingDirectory || context.working_directory ||
    process.env.CLAUDE_CWD || process.env.CLAUDE_WORKING_DIR || process.env.CLAUDE_PROJECT_DIR || process.env.PWD;

  const eventData = {
    event,
    project: projectName,
    time: Date.now()
  };

  // Log event for tray
  try {
    writeFileSync(LAST_EVENT_FILE, JSON.stringify(eventData));
  } catch {}

  // Log to history if stats enabled (minimal: one line append)
  const config = loadConfig();
  if (config.logStats) {
    try {
      appendFileSync(HISTORY_FILE, JSON.stringify(eventData) + '\n');
    } catch {}
  }

  // Play sound first (to check if easter egg triggered)
  const result = await playSound(event, null, { force: options?.force, projectDir });

  // Skip notification for thinking and easter eggs (playful sounds = sound only)
  const skipNotification = event === 'thinking' || result?.easterEgg;

  if (!skipNotification && result?.played) {
    await showNotification(event, projectName);
  }
}
