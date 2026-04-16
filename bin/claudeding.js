#!/usr/bin/env node
import { program } from 'commander';
import setup from '../src/commands/setup.js';
import uninstall from '../src/commands/uninstall.js';
import play from '../src/commands/play.js';
import config from '../src/commands/config.js';
import sounds from '../src/commands/sounds.js';
import settings from '../src/commands/settings.js';
import mute from '../src/commands/mute.js';
import doctor from '../src/commands/doctor.js';
import { enable, disable } from '../src/commands/toggle.js';
import snooze from '../src/commands/snooze.js';
import tray from '../src/commands/tray.js';
import stats from '../src/commands/stats.js';
import status from '../src/commands/status.js';
import stopThinkingCmd from '../src/commands/stopThinking.js';

program
  .name('claudeding')
  .description('Audio notifications for Claude Code')
  .version('1.0.16')
  .addHelpText('after', `
Examples:
  $ claudeding setup          # First-time setup
  $ claudeding settings       # Interactive settings menu
  $ claudeding sounds         # Change notification sounds
  $ claudeding mute --on      # Mute sounds
  $ claudeding snooze 30m     # Pause for 30 minutes
  $ claudeding enable farts   # Enable easter eggs

More info: https://github.com/ImJustRicky/claudeding
`);

// ─── Setup & Diagnostics ─────────────────────────────────────────────────────

program
  .command('setup')
  .description('Install hooks (run this first!)')
  .option('--complete-sound <path>', 'Custom sound for task completion')
  .option('--feedback-sound <path>', 'Custom sound for feedback needed')
  .action(setup);

program
  .command('uninstall')
  .description('Remove all claudeding hooks')
  .action(uninstall);

program
  .command('doctor')
  .description('Check if everything is working')
  .action(doctor);

program
  .command('status')
  .description('Quick overview of current state')
  .action(status);

// ─── Configuration ───────────────────────────────────────────────────────────

program
  .command('settings')
  .description('Interactive settings menu')
  .action(settings);

program
  .command('sounds')
  .description('Pick notification sounds')
  .action(sounds);

program
  .command('config')
  .description('Show current config (read-only)')
  .action(config);

// ─── Quick Controls ──────────────────────────────────────────────────────────

program
  .command('mute')
  .description('Mute/unmute sounds')
  .option('--on', 'Mute')
  .option('--off', 'Unmute')
  .action(mute);

program
  .command('snooze [duration]')
  .description('Pause sounds (e.g., 30m, 2h)')
  .option('--off', 'Cancel snooze')
  .action(snooze);

program
  .command('enable <feature>')
  .description('Enable: complete, feedback, error, thinking, farts')
  .action(enable);

program
  .command('disable <feature>')
  .description('Disable: complete, feedback, error, thinking, farts')
  .action(disable);

// ─── Extras ──────────────────────────────────────────────────────────────────

program
  .command('tray')
  .description('Menu bar widget (macOS)')
  .action(tray);

program
  .command('stats')
  .description('Usage statistics')
  .option('--on', 'Enable logging')
  .option('--off', 'Disable logging')
  .action(stats);

program
  .command('play <event>')
  .description('Test a sound: complete, feedback, error, thinking')
  .option('-f, --force', 'Bypass focus detection')
  .action(play);

// ─── Internal (hidden) ───────────────────────────────────────────────────────

program
  .command('stop-thinking', { hidden: true })
  .description('Stop thinking music (internal)')
  .action(stopThinkingCmd);

program.parse();
