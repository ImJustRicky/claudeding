import { existsSync } from 'fs';
import { platform } from 'os';
import { execSync } from 'child_process';
import { loadConfig, getConfigPath } from '../lib/config.js';
import { checkHooksInstalled } from '../lib/hooks.js';
import { getBundledSounds } from '../lib/audio.js';
import { isSnoozing, getSnoozeRemaining } from './snooze.js';
import { isDndActive } from '../lib/dnd.js';

function check(name, condition, fix = null) {
  const status = condition ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`  ${status} ${name}`);
  if (!condition && fix) {
    console.log(`    └─ Fix: ${fix}`);
  }
  return condition;
}

function checkAudioPlayer() {
  const os = platform();

  if (os === 'darwin') {
    try {
      execSync('which afplay', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  } else if (os === 'linux') {
    try {
      execSync('which paplay', { stdio: 'ignore' });
      return true;
    } catch {
      try {
        execSync('which aplay', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    }
  } else if (os === 'win32') {
    return true; // PowerShell is always available
  }

  return false;
}

function checkNotifier() {
  const os = platform();

  if (os === 'darwin') {
    try {
      execSync('which terminal-notifier', { stdio: 'ignore' });
      return 'terminal-notifier';
    } catch {
      return 'osascript (fallback)';
    }
  } else if (os === 'linux') {
    try {
      execSync('which notify-send', { stdio: 'ignore' });
      return 'notify-send';
    } catch {
      return null;
    }
  } else if (os === 'win32') {
    return 'PowerShell Toast';
  }

  return null;
}

export default async function doctor() {
  console.log('\nclaudeding diagnostics\n');

  const config = loadConfig();
  const hooks = checkHooksInstalled();
  const sounds = getBundledSounds();

  let allGood = true;

  // Config
  console.log('Configuration:');
  allGood &= check('Config file exists', existsSync(getConfigPath()), 'Run: claudeding setup');
  allGood &= check('Not muted', !config.mute, 'Run: claudeding mute --off');
  allGood &= check('Not snoozing', !isSnoozing(), 'Run: claudeding snooze --off');
  console.log('');

  // Hooks
  console.log('Hooks:');
  console.log(`  \x1b[90m○\x1b[0m UserPromptSubmit (thinking): ${hooks.userPromptSubmit ? 'enabled' : 'off (optional)'}`);
  allGood &= check('Notification hook (feedback)', hooks.notification, 'Run: claudeding setup');
  allGood &= check('Stop hook (complete)', hooks.stop, 'Run: claudeding setup');
  allGood &= check('PostToolUseFailure hook (error)', hooks.postToolUseFailure, 'Run: claudeding setup');
  console.log('');

  // Audio
  console.log('Audio:');
  const hasPlayer = checkAudioPlayer();
  const os = platform();
  const playerName = os === 'darwin' ? 'afplay' : os === 'linux' ? 'paplay/aplay' : 'PowerShell';
  allGood &= check(`Audio player (${playerName})`, hasPlayer, 'Install audio player for your OS');

  const completeSound = sounds.complete.length > 0;
  const feedbackSound = sounds.feedback.length > 0;
  const errorSound = sounds.error.length > 0;
  const thinkingSound = sounds.thinking.length > 0;
  allGood &= check('Complete sounds available', completeSound);
  allGood &= check('Feedback sounds available', feedbackSound);
  allGood &= check('Error sounds available', errorSound);
  allGood &= check('Thinking sounds available', thinkingSound);
  console.log('');

  // Notifications
  console.log('Notifications:');
  const notifier = checkNotifier();
  allGood &= check(`Desktop notifier (${notifier || 'none'})`, !!notifier,
    os === 'darwin' ? 'Run: brew install terminal-notifier' :
    os === 'linux' ? 'Install notify-send' : '');
  allGood &= check('Notifications enabled', config.notify !== false);
  console.log('');

  // Settings
  console.log('Settings:');
  console.log(`  Volume: ${config.volume ?? 100}%`);
  console.log(`  Skip when focused: ${config.skipWhenFocused !== false ? 'yes' : 'no'}`);
  console.log(`  AFK timeout: ${config.afkTimeout ?? 30}s`);
  console.log(`  Quiet hours: ${config.quietHours?.enabled ? `${config.quietHours.start} - ${config.quietHours.end}` : 'off'}`);
  console.log(`  Respect system DND: ${config.respectDnd ? 'yes' : 'no'}${config.respectDnd && isDndActive() ? ' (currently active)' : ''}`);
  console.log(`  Per-project config: ${config.useProjectConfig ? 'yes' : 'no'}`);
  console.log(`  Menu bar: Run "claudeding tray" to start (macOS only)`);
  console.log('');

  // Summary
  if (allGood) {
    console.log('\x1b[32mAll checks passed!\x1b[0m Try: claudeding play complete --force\n');
  } else {
    console.log('\x1b[33mSome issues found. See fixes above.\x1b[0m\n');
  }
}
