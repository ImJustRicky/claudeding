import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');

const EVENT_MAP = {
  complete: 'Stop',
  feedback: 'Notification',
  error: 'PostToolUseFailure'
};

const HOOK_COMMANDS = {
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
  const validEvents = ['complete', 'feedback', 'error'];

  if (!validEvents.includes(event)) {
    console.error(`Error: Invalid event "${event}". Use: complete, feedback, or error`);
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
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  saveSettings(settings);
  console.log(`Disabled ${event} sound.`);
}

export async function enable(event) {
  const validEvents = ['complete', 'feedback', 'error'];

  if (!validEvents.includes(event)) {
    console.error(`Error: Invalid event "${event}". Use: complete, feedback, or error`);
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

  saveSettings(settings);
  console.log(`Enabled ${event} sound.`);
}
