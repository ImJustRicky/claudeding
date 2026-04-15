import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json');
const BACKUP_PATH = join(CLAUDE_DIR, 'settings.json.claudeding-backup');

const CLAUDEDING_HOOKS = {
  UserPromptSubmit: [
    {
      hooks: [
        {
          type: 'command',
          command: 'claudeding play thinking'
        }
      ]
    }
  ],
  PreToolUse: [
    {
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: 'claudeding stop-thinking'
        }
      ]
    }
  ],
  Notification: [
    {
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: 'claudeding play feedback'
        }
      ]
    }
  ],
  Stop: [
    {
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: 'claudeding play complete'
        }
      ]
    }
  ],
  PostToolUseFailure: [
    {
      matcher: '',
      hooks: [
        {
          type: 'command',
          command: 'claudeding play error'
        }
      ]
    }
  ]
};

function loadSettings() {
  if (!existsSync(SETTINGS_PATH)) {
    return {};
  }

  try {
    const content = readFileSync(SETTINGS_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
}

function backupSettings() {
  if (existsSync(SETTINGS_PATH)) {
    copyFileSync(SETTINGS_PATH, BACKUP_PATH);
    return true;
  }
  return false;
}

function hasClaudedingHook(hookArray) {
  return hookArray?.some(entry =>
    entry.hooks?.some(h => h.command?.includes('claudeding'))
  );
}

function removeClaudedingHooks(hookArray) {
  if (!Array.isArray(hookArray)) return hookArray;

  return hookArray
    .map(entry => {
      if (!entry.hooks) return entry;
      const filteredHooks = entry.hooks.filter(h => !h.command?.includes('claudeding'));
      if (filteredHooks.length === 0) return null;
      return { ...entry, hooks: filteredHooks };
    })
    .filter(Boolean);
}

export function installHooks() {
  const settings = loadSettings();
  const hadBackup = backupSettings();

  if (!settings.hooks) {
    settings.hooks = {};
  }

  // NOTE: UserPromptSubmit (thinking/Jeopardy) is NOT installed by default
  // Users can enable with: claudeding enable thinking

  // Add Notification hooks if not already present
  if (!hasClaudedingHook(settings.hooks.Notification)) {
    settings.hooks.Notification = [
      ...(settings.hooks.Notification || []),
      ...CLAUDEDING_HOOKS.Notification
    ];
  }

  // Add Stop hooks if not already present
  if (!hasClaudedingHook(settings.hooks.Stop)) {
    settings.hooks.Stop = [
      ...(settings.hooks.Stop || []),
      ...CLAUDEDING_HOOKS.Stop
    ];
  }

  // Add PostToolUseFailure hooks if not already present
  if (!hasClaudedingHook(settings.hooks.PostToolUseFailure)) {
    settings.hooks.PostToolUseFailure = [
      ...(settings.hooks.PostToolUseFailure || []),
      ...CLAUDEDING_HOOKS.PostToolUseFailure
    ];
  }

  saveSettings(settings);

  return { settingsPath: SETTINGS_PATH, backedUp: hadBackup, backupPath: BACKUP_PATH };
}

export function uninstallHooks() {
  const settings = loadSettings();

  if (!settings.hooks) {
    return { removed: false, settingsPath: SETTINGS_PATH };
  }

  let removed = false;

  if (hasClaudedingHook(settings.hooks.UserPromptSubmit)) {
    settings.hooks.UserPromptSubmit = removeClaudedingHooks(settings.hooks.UserPromptSubmit);
    removed = true;
  }

  if (hasClaudedingHook(settings.hooks.Notification)) {
    settings.hooks.Notification = removeClaudedingHooks(settings.hooks.Notification);
    removed = true;
  }

  if (hasClaudedingHook(settings.hooks.Stop)) {
    settings.hooks.Stop = removeClaudedingHooks(settings.hooks.Stop);
    removed = true;
  }

  if (hasClaudedingHook(settings.hooks.PostToolUseFailure)) {
    settings.hooks.PostToolUseFailure = removeClaudedingHooks(settings.hooks.PostToolUseFailure);
    removed = true;
  }

  // Clean up empty arrays
  if (settings.hooks.UserPromptSubmit?.length === 0) {
    delete settings.hooks.UserPromptSubmit;
  }
  if (settings.hooks.Notification?.length === 0) {
    delete settings.hooks.Notification;
  }
  if (settings.hooks.Stop?.length === 0) {
    delete settings.hooks.Stop;
  }
  if (settings.hooks.PostToolUseFailure?.length === 0) {
    delete settings.hooks.PostToolUseFailure;
  }
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  saveSettings(settings);

  return { removed, settingsPath: SETTINGS_PATH };
}

export function checkHooksInstalled() {
  const settings = loadSettings();
  return {
    userPromptSubmit: hasClaudedingHook(settings.hooks?.UserPromptSubmit),
    notification: hasClaudedingHook(settings.hooks?.Notification),
    stop: hasClaudedingHook(settings.hooks?.Stop),
    postToolUseFailure: hasClaudedingHook(settings.hooks?.PostToolUseFailure)
  };
}
