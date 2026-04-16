import inquirer from 'inquirer';
import { loadConfig, updateConfig } from '../lib/config.js';
import { playSound } from '../lib/audio.js';

const SETTINGS_MENU = [
  { name: 'Volume', value: 'volume' },
  { name: 'Focus Detection', value: 'focus' },
  { name: 'AFK Timeout', value: 'afk' },
  { name: 'Quiet Hours', value: 'quietHours' },
  { name: 'System DND', value: 'dnd' },
  { name: 'Easter Eggs (farts)', value: 'easterEggs' },
  { name: 'Stats Logging', value: 'stats' },
  new inquirer.Separator(),
  { name: 'Back to main menu', value: 'back' }
];

async function volumeSetting() {
  const config = loadConfig();
  const { volume } = await inquirer.prompt([
    {
      type: 'number',
      name: 'volume',
      message: 'Volume (0-100):',
      default: config.volume ?? 100,
      validate: (v) => v >= 0 && v <= 100 ? true : 'Must be 0-100'
    }
  ]);
  updateConfig({ volume });
  console.log(`Volume set to ${volume}%`);

  const { test } = await inquirer.prompt([
    { type: 'confirm', name: 'test', message: 'Test sound?', default: true }
  ]);
  if (test) {
    await playSound('complete', null, { force: true });
  }
}

async function focusSetting() {
  const config = loadConfig();
  const { skipWhenFocused } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'skipWhenFocused',
      message: 'Skip sounds when terminal is focused?',
      default: config.skipWhenFocused !== false
    }
  ]);
  updateConfig({ skipWhenFocused });
  console.log(skipWhenFocused ? 'Focus detection enabled' : 'Focus detection disabled');
}

async function afkSetting() {
  const config = loadConfig();
  const { afkTimeout } = await inquirer.prompt([
    {
      type: 'number',
      name: 'afkTimeout',
      message: 'AFK timeout in seconds (0 to disable):',
      default: config.afkTimeout ?? 30,
      validate: (v) => v >= 0 ? true : 'Must be 0 or more'
    }
  ]);
  updateConfig({ afkTimeout });
  console.log(afkTimeout > 0 ? `AFK detection: ${afkTimeout}s` : 'AFK detection disabled');
}

async function quietHoursSetting() {
  const config = loadConfig();
  const qh = config.quietHours || {};

  const { enabled } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enabled',
      message: 'Enable quiet hours?',
      default: qh.enabled || false
    }
  ]);

  if (!enabled) {
    updateConfig({ quietHours: { enabled: false } });
    console.log('Quiet hours disabled');
    return;
  }

  const { start, end } = await inquirer.prompt([
    {
      type: 'input',
      name: 'start',
      message: 'Start time (24h format, e.g., 22:00):',
      default: qh.start || '22:00',
      validate: (v) => /^\d{1,2}:\d{2}$/.test(v) ? true : 'Use format HH:MM'
    },
    {
      type: 'input',
      name: 'end',
      message: 'End time (24h format, e.g., 08:00):',
      default: qh.end || '08:00',
      validate: (v) => /^\d{1,2}:\d{2}$/.test(v) ? true : 'Use format HH:MM'
    }
  ]);

  updateConfig({ quietHours: { enabled: true, start, end } });
  console.log(`Quiet hours: ${start} - ${end}`);
}

async function dndSetting() {
  const config = loadConfig();
  const { respectDnd } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'respectDnd',
      message: 'Respect system Do Not Disturb / Focus mode?',
      default: config.respectDnd || false
    }
  ]);
  updateConfig({ respectDnd });
  console.log(respectDnd ? 'Will respect system DND' : 'Will ignore system DND');
}

async function easterEggsSetting() {
  const config = loadConfig();
  const { easterEggs } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'easterEggs',
      message: 'Enable easter eggs? (1% chance of fart sounds)',
      default: config.easterEggs || false
    }
  ]);
  updateConfig({ easterEggs });
  console.log(easterEggs ? 'Easter eggs enabled' : 'Easter eggs disabled');
}

async function statsSetting() {
  const config = loadConfig();
  const { logStats } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'logStats',
      message: 'Log usage stats?',
      default: config.logStats || false
    }
  ]);
  updateConfig({ logStats });
  console.log(logStats ? 'Stats logging enabled' : 'Stats logging disabled');
}

export default async function settings() {
  console.log('\n  claudeding Settings\n');

  while (true) {
    const config = loadConfig();

    // Show current status
    console.log('  Current:');
    console.log(`    Volume: ${config.volume ?? 100}%`);
    console.log(`    Focus detection: ${config.skipWhenFocused !== false ? 'on' : 'off'}`);
    console.log(`    AFK timeout: ${config.afkTimeout ?? 30}s`);
    console.log(`    Quiet hours: ${config.quietHours?.enabled ? `${config.quietHours.start}-${config.quietHours.end}` : 'off'}`);
    console.log(`    Respect DND: ${config.respectDnd ? 'on' : 'off'}`);
    console.log(`    Easter eggs: ${config.easterEggs ? 'on' : 'off'}`);
    console.log(`    Stats: ${config.logStats ? 'on' : 'off'}`);
    console.log('');

    const { setting } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setting',
        message: 'What would you like to configure?',
        choices: SETTINGS_MENU
      }
    ]);

    if (setting === 'back') break;

    console.log('');

    switch (setting) {
      case 'volume': await volumeSetting(); break;
      case 'focus': await focusSetting(); break;
      case 'afk': await afkSetting(); break;
      case 'quietHours': await quietHoursSetting(); break;
      case 'dnd': await dndSetting(); break;
      case 'easterEggs': await easterEggsSetting(); break;
      case 'stats': await statsSetting(); break;
    }

    console.log('');
  }

  console.log('Settings saved!\n');
}
