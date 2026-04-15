#!/usr/bin/env node
import { program } from 'commander';
import setup from '../src/commands/setup.js';
import uninstall from '../src/commands/uninstall.js';
import play from '../src/commands/play.js';
import config from '../src/commands/config.js';
import sounds from '../src/commands/sounds.js';
import mute from '../src/commands/mute.js';

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
  .description('Play notification sound (complete or feedback)')
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

program.parse();
