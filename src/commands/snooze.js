import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const SNOOZE_FILE = join(homedir(), '.claudeding-snooze');

function parseTime(input) {
  const match = input.match(/^(\d+)(s|m|h)?$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'm').toLowerCase();

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    default: return value * 60 * 1000;
  }
}

function formatRemaining(ms) {
  if (ms <= 0) return 'expired';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function isSnoozing() {
  if (!existsSync(SNOOZE_FILE)) return false;

  try {
    const resumeAt = parseInt(readFileSync(SNOOZE_FILE, 'utf-8'), 10);
    if (Date.now() < resumeAt) {
      return true;
    }
    // Snooze expired, clean up
    unlinkSync(SNOOZE_FILE);
    return false;
  } catch {
    return false;
  }
}

export function getSnoozeRemaining() {
  if (!existsSync(SNOOZE_FILE)) return 0;

  try {
    const resumeAt = parseInt(readFileSync(SNOOZE_FILE, 'utf-8'), 10);
    return Math.max(0, resumeAt - Date.now());
  } catch {
    return 0;
  }
}

export default async function snooze(duration, options) {
  // No args = show status or cancel
  if (!duration) {
    if (options?.off) {
      if (existsSync(SNOOZE_FILE)) {
        unlinkSync(SNOOZE_FILE);
        console.log('Snooze cancelled. Sounds are back on.');
      } else {
        console.log('Not currently snoozing.');
      }
      return;
    }

    const remaining = getSnoozeRemaining();
    if (remaining > 0) {
      console.log(`Snoozing for ${formatRemaining(remaining)}`);
      console.log('Run "claudeding snooze --off" to cancel.');
    } else {
      console.log('Not snoozing. Run "claudeding snooze 30m" to snooze.');
    }
    return;
  }

  const ms = parseTime(duration);
  if (!ms) {
    console.error('Invalid duration. Use: 30s, 30m, 2h');
    process.exit(1);
  }

  const resumeAt = Date.now() + ms;
  writeFileSync(SNOOZE_FILE, resumeAt.toString());

  console.log(`Snoozing for ${formatRemaining(ms)}. Sounds paused.`);
  console.log('Run "claudeding snooze --off" to cancel.');
}
