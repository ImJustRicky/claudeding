import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_PATH = join(homedir(), '.claudeding.json');

const DEFAULT_CONFIG = {
  sounds: {
    complete: null,
    feedback: null
  },
  notify: true,
  mute: false,
  skipWhenFocused: true  // Don't play sounds when terminal/Claude Code is focused
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
