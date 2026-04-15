import { spawn } from 'child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { platform, homedir } from 'os';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { loadConfig, updateConfig, getEffectiveConfig } from './config.js';
import { isClaudeCodeFocused } from './focus.js';
import { isSnoozing } from '../commands/snooze.js';
import { isDndActive } from './dnd.js';

const DEBOUNCE_FILE = join(homedir(), '.claudeding-lastplay');
const DEBOUNCE_MS = 1500; // 1.5 seconds between sounds

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, '..', 'audio');
const LEGACY_SOUNDS_DIR = join(__dirname, '..', 'sounds');

// Check if current time is within quiet hours
function isQuietHours() {
  const config = loadConfig();
  const qh = config.quietHours;

  if (!qh?.enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = (qh.start || '22:00').split(':').map(Number);
  const [endH, endM] = (qh.end || '08:00').split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight quiet hours (e.g., 22:00 - 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// Get list of bundled sounds for each event type
export function getBundledSounds() {
  const result = { complete: [], feedback: [], error: [] };

  for (const event of ['complete', 'feedback', 'error']) {
    const dir = join(AUDIO_DIR, event);
    if (!existsSync(dir)) continue;

    const files = readdirSync(dir).filter(f => f.endsWith('.wav') || f.endsWith('.mp3'));
    result[event] = files.map(f => {
      const ext = f.endsWith('.mp3') ? '.mp3' : '.wav';
      return {
        name: basename(f, ext),
        file: f,
        path: join(dir, f)
      };
    });
  }

  return result;
}

// Get currently selected sounds from config
export function getSelectedSounds() {
  const config = loadConfig();
  return {
    complete: config.sounds?.complete || null,
    feedback: config.sounds?.feedback || null,
    error: config.sounds?.error || null
  };
}

// Set selected sound (by name for bundled, or path for custom)
export function setSelectedSound(event, nameOrPath) {
  const sounds = { [event]: nameOrPath };
  updateConfig({ sounds });
}

// Resolve sound path from name or custom path
function getSoundPath(event, overrideName = null) {
  const config = loadConfig();
  const selected = overrideName || config.sounds?.[event];

  // If it's an absolute path and exists, use it
  if (selected && selected.startsWith('/') && existsSync(selected)) {
    return selected;
  }

  // If it's a name, look in bundled audio folder
  if (selected) {
    const bundled = getBundledSounds();
    const found = bundled[event]?.find(s => s.name === selected);
    if (found) return found.path;
  }

  // Fallback: prefer sound named after the event (e.g., "complete" for complete event)
  const bundled = getBundledSounds();
  const defaultSound = bundled[event]?.find(s => s.name === event);
  if (defaultSound) {
    return defaultSound.path;
  }

  // Otherwise use first bundled sound if available
  if (bundled[event]?.length > 0) {
    return bundled[event][0].path;
  }

  // Legacy fallback to old sounds dir
  const legacyPath = join(LEGACY_SOUNDS_DIR, `${event}.wav`);
  if (existsSync(legacyPath)) {
    return legacyPath;
  }

  return null;
}

function playMacOS(filePath, volume) {
  return new Promise((resolve, reject) => {
    // afplay volume is 0-1, config is 0-100
    const vol = Math.max(0, Math.min(1, (volume ?? 100) / 100));
    const proc = spawn('afplay', ['-v', vol.toString(), filePath]);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`afplay exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

function playLinux(filePath, volume) {
  return new Promise((resolve, reject) => {
    // paplay uses 0-65536, we'll scale from 0-100
    const vol = Math.round((volume ?? 100) * 655.36);
    const proc = spawn('paplay', ['--volume', vol.toString(), filePath]);

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // aplay doesn't support volume, fall back without it
        const fallback = spawn('aplay', [filePath]);
        fallback.on('close', (fallbackCode) => {
          if (fallbackCode === 0) resolve();
          else reject(new Error(`Audio playback failed`));
        });
        fallback.on('error', reject);
      }
    });

    proc.on('error', () => {
      const fallback = spawn('aplay', [filePath]);
      fallback.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Audio playback failed`));
      });
      fallback.on('error', reject);
    });
  });
}

function playWindows(filePath, volume) {
  return new Promise((resolve, reject) => {
    // Windows SoundPlayer doesn't support volume directly, use system volume
    const script = `(New-Object Media.SoundPlayer '${filePath.replace(/'/g, "''")}').PlaySync()`;
    const proc = spawn('powershell', ['-c', script]);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`PowerShell exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

function shouldDebounce() {
  try {
    if (!existsSync(DEBOUNCE_FILE)) return false;
    const lastPlay = parseInt(readFileSync(DEBOUNCE_FILE, 'utf-8'), 10);
    return Date.now() - lastPlay < DEBOUNCE_MS;
  } catch {
    return false;
  }
}

function markPlayed() {
  try {
    writeFileSync(DEBOUNCE_FILE, Date.now().toString());
  } catch {
    // Ignore write errors
  }
}

export async function playSound(event, overrideName = null, options = {}) {
  const config = getEffectiveConfig(options.projectDir);
  const force = options.force === true;

  // Skip checks if force flag is set (for manual testing)
  if (!force) {
    // Skip sound if muted
    if (config.mute) {
      return;
    }

    // Skip sound if snoozing
    if (isSnoozing()) {
      return;
    }

    // Skip sound during quiet hours
    if (isQuietHours()) {
      return;
    }

    // Skip sound if system DND/Focus mode is on (if respectDnd is enabled)
    if (isDndActive()) {
      return;
    }

    // Skip sound if Claude Code / terminal is focused (user is already looking)
    if (config.skipWhenFocused !== false && isClaudeCodeFocused()) {
      return;
    }

    // Debounce: skip if sound played recently (prevents spam from multiple instances)
    if (shouldDebounce()) {
      return;
    }
  }

  const soundPath = getSoundPath(event, overrideName);

  if (!soundPath || !existsSync(soundPath)) {
    console.warn(`Warning: Sound file not found for "${event}"`);
    return;
  }

  const os = platform();

  try {
    markPlayed(); // Mark before playing to prevent race conditions

    const volume = config.volume ?? 100;

    if (os === 'darwin') {
      await playMacOS(soundPath, volume);
    } else if (os === 'linux') {
      await playLinux(soundPath, volume);
    } else if (os === 'win32') {
      await playWindows(soundPath, volume);
    } else {
      console.warn(`Warning: Unsupported platform: ${os}`);
    }
  } catch (err) {
    console.warn(`Warning: Failed to play sound: ${err.message}`);
  }
}
