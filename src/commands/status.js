import { loadConfig } from '../lib/config.js';
import { checkHooksInstalled } from '../lib/hooks.js';
import { isSnoozing, getSnoozeRemaining } from './snooze.js';
import { existsSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default async function status() {
  const config = loadConfig();
  const hooks = checkHooksInstalled();
  const snoozing = isSnoozing();

  console.log('\n  claudeding status\n');

  // Overall state
  let state = '🔔 Active';
  if (config.mute) state = '🔇 Muted';
  else if (snoozing) {
    const remaining = getSnoozeRemaining();
    state = `💤 Snoozing (${formatTime(remaining)} left)`;
  }
  console.log(`  State: ${state}`);
  console.log(`  Volume: ${config.volume ?? 100}%`);
  console.log('');

  // Hooks
  console.log('  Hooks:');
  console.log(`    Complete (Stop):        ${hooks.stop ? '✓' : '✗'}`);
  console.log(`    Feedback (Notification): ${hooks.notification ? '✓' : '✗'}`);
  console.log(`    Error (ToolFailure):     ${hooks.postToolUseFailure ? '✓' : '✗'}`);
  console.log(`    Thinking (UserPrompt):   ${hooks.userPromptSubmit ? '✓' : '✗'}`);
  console.log('');

  // Features
  console.log('  Features:');
  console.log(`    Skip when focused: ${config.skipWhenFocused !== false ? 'on' : 'off'}`);
  console.log(`    AFK override:      ${config.afkTimeout > 0 ? config.afkTimeout + 's' : 'off'}`);
  console.log(`    Quiet hours:       ${config.quietHours?.enabled ? config.quietHours.start + '-' + config.quietHours.end : 'off'}`);
  console.log(`    Respect DND:       ${config.respectDnd ? 'on' : 'off'}`);
  console.log(`    Easter eggs:       ${config.easterEggs ? 'on' : 'off'}`);
  console.log(`    Webhooks:          ${config.webhooks?.length > 0 ? config.webhooks.length + ' configured' : 'none'}`);
  console.log('');

  // Stats
  if (config.logStats) {
    const historyFile = join(homedir(), '.claudeding-history.jsonl');
    if (existsSync(historyFile)) {
      const size = statSync(historyFile).size;
      const kb = (size / 1024).toFixed(1);
      console.log(`  Stats: logging (${kb} KB)`);
    } else {
      console.log('  Stats: logging (no data yet)');
    }
  } else {
    console.log('  Stats: off');
  }

  console.log('');
}
