import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_PATH = join(homedir(), '.claudeding.json');
const PROJECT_CONFIG_NAME = '.claudeding.json';

const DEFAULT_CONFIG = {
  sounds: {
    complete: null,
    feedback: null,
    error: null,
    thinking: null
  },
  notify: true,
  mute: false,
  volume: 100,            // Volume 0-100
  skipWhenFocused: true,  // Don't play sounds when terminal/Claude Code is focused
  afkTimeout: 30,         // Seconds of idle time before considering user AFK (plays sound even if focused)
  respectDnd: false,      // Skip sounds when system DND/Focus mode is on (off by default)
  useProjectConfig: false, // Use .claudeding.json in project root if present
  showTray: false,        // Show menu bar widget (macOS only)
  logStats: false,        // Log events to ~/.claudeding-history.jsonl (off by default)
  easterEggs: false,      // Enable easter eggs (off by default)
  quietHours: {
    enabled: false,
    start: '22:00',       // 24-hour format
    end: '08:00'
  }
};

export function getConfigPath() {
  return CONFIG_PATH;
}

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...config };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// Find project config by walking up from cwd
function findProjectConfig(startDir) {
  let dir = startDir || process.env.PWD || process.cwd();

  // Walk up to find .claudeding.json (max 10 levels)
  for (let i = 0; i < 10; i++) {
    const configPath = join(dir, PROJECT_CONFIG_NAME);
    if (existsSync(configPath)) {
      return configPath;
    }
    const parent = join(dir, '..');
    if (parent === dir) break; // reached root
    dir = parent;
  }

  return null;
}

// Load project-specific config
export function loadProjectConfig(projectDir) {
  const configPath = findProjectConfig(projectDir);
  if (!configPath) return null;

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Get effective config (global merged with project if enabled)
export function getEffectiveConfig(projectDir) {
  const globalConfig = loadConfig();

  if (!globalConfig.useProjectConfig) {
    return globalConfig;
  }

  const projectConfig = loadProjectConfig(projectDir);
  if (!projectConfig) {
    return globalConfig;
  }

  // Merge: project overrides global
  const merged = { ...globalConfig, ...projectConfig };
  if (projectConfig.sounds) {
    merged.sounds = { ...globalConfig.sounds, ...projectConfig.sounds };
  }

  return merged;
}

export function saveConfig(config) {
  const merged = { ...DEFAULT_CONFIG, ...config };
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2) + '\n');
}

export function updateConfig(updates) {
  const config = loadConfig();
  const merged = { ...config, ...updates };
  if (updates.sounds) {
    merged.sounds = { ...config.sounds, ...updates.sounds };
  }
  saveConfig(merged);
  return merged;
}
