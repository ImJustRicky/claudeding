import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { updateConfig, loadConfig } from '../lib/config.js';

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');

// Config-based features (not hooks)
const CONFIG_FEATURES = ['farts', 'fart', 'eastereggs'];

const EVENT_MAP = {
  thinking: 'UserPromptSubmit',
  'stop-thinking': 'PreToolUse',
  complete: 'Stop',
  feedback: 'Notification',
  error: 'PostToolUseFailure'
};

const HOOK_COMMANDS = {
  thinking: 'claudeding play thinking',
  'stop-thinking': 'claudeding stop-thinking',
  complete: 'claudeding play complete',
  feedback: 'claudeding play feedback',
  error: 'claudeding play error'
};

function loadSettings() {
  if (!existsSync(SETTINGS_PATH)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

function hasClaudedingHook(hookArray) {
  return hookArray?.some(entry =>
    entry.hooks?.some(h => h.command?.includes('claudeding'))
  );
}

function removeClaudedingHook(hookArray) {
  if (!Array.isArray(hookArray)) return [];

  return hookArray
    .map(entry => {
      if (!entry.hooks) return entry;
      const filteredHooks = entry.hooks.filter(h => !h.command?.includes('claudeding'));
      if (filteredHooks.length === 0) return null;
      return { ...entry, hooks: filteredHooks };
    })
    .filter(Boolean);
}

function addClaudedingHook(hookArray, command) {
  const arr = hookArray || [];
  return [
    ...arr,
    {
      matcher: '',
      hooks: [{ type: 'command', command }]
    }
  ];
}

export async function disable(event) {
  // Handle config-based features
  if (CONFIG_FEATURES.includes(event)) {
    const config = loadConfig();
    if (!config.easterEggs) {
      console.log('Easter eggs are already disabled.');
      return;
    }
    updateConfig({ easterEggs: false });
    console.log('Disabled easter eggs (farts).');
    return;
  }

  const validEvents = ['thinking', 'complete', 'feedback', 'error'];

  if (!validEvents.includes(event)) {
    console.error(`Error: Invalid event "${event}". Use: thinking, complete, feedback, error, or farts`);
    process.exit(1);
  }

  const hookType = EVENT_MAP[event];
  const settings = loadSettings();

  if (!settings.hooks?.[hookType] || !hasClaudedingHook(settings.hooks[hookType])) {
    console.log(`${event} hook is already disabled.`);
    return;
  }

  settings.hooks[hookType] = removeClaudedingHook(settings.hooks[hookType]);

  if (settings.hooks[hookType].length === 0) {
    delete settings.hooks[hookType];
  }

  // If disabling thinking, also disable stop-thinking (PreToolUse)
  if (event === 'thinking') {
    const stopHookType = EVENT_MAP['stop-thinking'];
    if (settings.hooks?.[stopHookType]) {
      settings.hooks[stopHookType] = removeClaudedingHook(settings.hooks[stopHookType]);
      if (settings.hooks[stopHookType].length === 0) {
        delete settings.hooks[stopHookType];
      }
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  saveSettings(settings);
  console.log(`Disabled ${event} sound.`);
}

export async function enable(event) {
  // Handle config-based features
  if (CONFIG_FEATURES.includes(event)) {
    const config = loadConfig();
    if (config.easterEggs) {
      console.log('Easter eggs are already enabled.');
      return;
    }
    updateConfig({ easterEggs: true });
    console.log('Enabled easter eggs (1% chance of farts).');
    return;
  }

  const validEvents = ['thinking', 'complete', 'feedback', 'error'];

  if (!validEvents.includes(event)) {
    console.error(`Error: Invalid event "${event}". Use: thinking, complete, feedback, error, or farts`);
    process.exit(1);
  }

  const hookType = EVENT_MAP[event];
  const settings = loadSettings();

  if (!settings.hooks) {
    settings.hooks = {};
  }

  if (hasClaudedingHook(settings.hooks[hookType])) {
    console.log(`${event} hook is already enabled.`);
    return;
  }

  settings.hooks[hookType] = addClaudedingHook(settings.hooks[hookType], HOOK_COMMANDS[event]);

  // If enabling thinking, also enable stop-thinking (PreToolUse) as failsafe
  if (event === 'thinking') {
    const stopHookType = EVENT_MAP['stop-thinking'];
    if (!hasClaudedingHook(settings.hooks[stopHookType])) {
      settings.hooks[stopHookType] = addClaudedingHook(settings.hooks[stopHookType], HOOK_COMMANDS['stop-thinking']);
    }
  }

  saveSettings(settings);
  console.log(`Enabled ${event} sound.`);
}
