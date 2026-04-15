#!/usr/bin/env node
import { program } from 'commander';
import setup from '../src/commands/setup.js';
import uninstall from '../src/commands/uninstall.js';
import play from '../src/commands/play.js';
import config from '../src/commands/config.js';
import sounds from '../src/commands/sounds.js';
import mute from '../src/commands/mute.js';
import doctor from '../src/commands/doctor.js';
import { enable, disable } from '../src/commands/toggle.js';
import snooze from '../src/commands/snooze.js';
import tray from '../src/commands/tray.js';
import stats from '../src/commands/stats.js';

program
  .name('claudeding')
  .description('Audio notifications for Claude Code')
  .version('1.0.0');

program
  .command('setup')
  .description('Install Claude Code hooks for audio notifications')
  .option('--complete-sound <path>', 'Custom sound file for task completion')
  .option('--feedback-sound <path>', 'Custom sound file for feedback needed')
  .action(setup);

program
  .command('uninstall')
  .description('Remove claudeding hooks from Claude Code')
  .action(uninstall);

program
  .command('play <event>')
  .description('Play notification sound (complete, feedback, or error)')
  .option('-f, --force', 'Bypass focus detection and play sound immediately')
  .action(play);

program
  .command('config')
  .description('Show current configuration')
  .action(config);

program
  .command('sounds')
  .description('Configure notification sounds (interactive)')
  .action(sounds);

program
  .command('mute')
  .description('Toggle sound mute (notifications still show)')
  .option('--on', 'Mute sounds')
  .option('--off', 'Unmute sounds')
  .option('--toggle', 'Toggle mute state')
  .action(mute);

program
  .command('doctor')
  .description('Run diagnostics to check configuration and dependencies')
  .action(doctor);

program
  .command('enable <event>')
  .description('Enable sound for event (complete, feedback, or error)')
  .action(enable);

program
  .command('disable <event>')
  .description('Disable sound for event (complete, feedback, or error)')
  .action(disable);

program
  .command('snooze [duration]')
  .description('Pause sounds temporarily (e.g., 30m, 2h)')
  .option('--off', 'Cancel snooze')
  .action(snooze);

program
  .command('tray')
  .description('Start menu bar widget (macOS only)')
  .action(tray);

program
  .command('stats')
  .description('View usage statistics (off by default)')
  .option('--on', 'Enable stats logging')
  .option('--off', 'Disable stats logging')
  .action(stats);

program.parse();
