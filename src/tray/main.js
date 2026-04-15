import { app, Tray, Menu, nativeImage } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, watchFile, unlinkSync } from 'fs';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG_PATH = join(homedir(), '.claudeding.json');
const SNOOZE_FILE = join(homedir(), '.claudeding-snooze');
const LAST_EVENT_FILE = join(homedir(), '.claudeding-lastevent');

const EVENT_TIMEOUT = 30000; // Show event icon for 30 seconds

let tray = null;

function loadConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch {}
  return {};
}

function getSnoozeRemaining() {
  try {
    if (!existsSync(SNOOZE_FILE)) return null;
    const resumeAt = parseInt(readFileSync(SNOOZE_FILE, 'utf-8'), 10);
    const remaining = resumeAt - Date.now();
    if (remaining <= 0) return null;

    const mins = Math.ceil(remaining / 60000);
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins}m`;
  } catch {
    return null;
  }
}

function getLastEvent() {
  try {
    if (!existsSync(LAST_EVENT_FILE)) return null;
    const data = JSON.parse(readFileSync(LAST_EVENT_FILE, 'utf-8'));

    // Only return if event is recent (within timeout)
    if (Date.now() - data.time < EVENT_TIMEOUT) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

function clearLastEvent() {
  try {
    if (existsSync(LAST_EVENT_FILE)) {
      unlinkSync(LAST_EVENT_FILE);
    }
  } catch {}
}

function isTerminalFocused() {
  const terminalApps = [
    'terminal', 'iterm', 'hyper', 'alacritty', 'kitty', 'warp',
    'wezterm', 'tabby', 'cursor', 'code', 'visual studio code',
    'zed', 'ghostty', 'rio'
  ];

  try {
    const result = execSync(
      'lsappinfo info -only name "$(lsappinfo front)" 2>/dev/null || echo ""',
      { encoding: 'utf-8', shell: '/bin/bash' }
    ).toLowerCase();

    return terminalApps.some(app => result.includes(app));
  } catch {
    return false;
  }
}

function getIdleSeconds() {
  try {
    const idle = execSync(
      "ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print int($NF/1000000000); exit}'",
      { encoding: 'utf-8', shell: '/bin/bash' }
    ).trim();
    return parseInt(idle, 10) || 0;
  } catch {
    return 0;
  }
}

function isUserActive() {
  const config = loadConfig();
  const afkTimeout = config.afkTimeout ?? 30;

  // User is active if terminal is focused AND not AFK
  if (isTerminalFocused() && getIdleSeconds() < afkTimeout) {
    return true;
  }
  return false;
}

function getEventIcon(event) {
  switch (event) {
    case 'complete': return '✅';
    case 'feedback': return '👋';
    case 'error': return '❌';
    default: return '🔔';
  }
}

function runCommand(cmd) {
  try {
    execSync(`claudeding ${cmd}`, { encoding: 'utf-8' });
  } catch (err) {
    console.error('Command failed:', err.message);
  }
}

function getStatusText() {
  const config = loadConfig();
  const snoozeRemaining = getSnoozeRemaining();

  if (snoozeRemaining) {
    return `Snoozing (${snoozeRemaining})`;
  } else if (config.mute) {
    return 'Muted';
  }
  return 'Active';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildMenu() {
  const config = loadConfig();
  const snoozeRemaining = getSnoozeRemaining();
  const lastEvent = getLastEvent();
  const isMuted = config.mute === true;
  const isSnoozing = snoozeRemaining !== null;

  const menuItems = [
    {
      label: `claudeding - ${getStatusText()}`,
      enabled: false
    },
  ];

  // Show last event if recent
  if (lastEvent) {
    menuItems.push({
      label: `${getEventIcon(lastEvent.event)} ${lastEvent.event}${lastEvent.project ? ` (${lastEvent.project})` : ''} at ${formatTime(lastEvent.time)}`,
      enabled: false
    });
  }

  return Menu.buildFromTemplate([
    ...menuItems,
    {
      label: isMuted ? '🔊 Unmute Sounds' : '🔇 Mute Sounds',
      click: () => {
        runCommand(isMuted ? 'mute --off' : 'mute --on');
        updateMenu();
      }
    },
    { type: 'separator' },
    {
      label: 'Snooze',
      submenu: [
        {
          label: '15 minutes',
          click: () => { runCommand('snooze 15m'); updateMenu(); }
        },
        {
          label: '30 minutes',
          click: () => { runCommand('snooze 30m'); updateMenu(); }
        },
        {
          label: '1 hour',
          click: () => { runCommand('snooze 1h'); updateMenu(); }
        },
        {
          label: '2 hours',
          click: () => { runCommand('snooze 2h'); updateMenu(); }
        },
        { type: 'separator' },
        {
          label: isSnoozing ? `Cancel Snooze (${snoozeRemaining} left)` : 'Not snoozing',
          enabled: isSnoozing,
          click: () => { runCommand('snooze --off'); updateMenu(); }
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Test Sounds',
      submenu: [
        {
          label: 'Play Complete',
          click: () => runCommand('play complete --force')
        },
        {
          label: 'Play Feedback',
          click: () => runCommand('play feedback --force')
        },
        {
          label: 'Play Error',
          click: () => runCommand('play error --force')
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Quit Menu Bar',
      click: () => app.quit()
    }
  ]);
}

function updateMenu() {
  if (tray) {
    const config = loadConfig();
    const snoozeRemaining = getSnoozeRemaining();
    let lastEvent = getLastEvent();

    // If user is back at terminal and active, clear the event notification
    if (lastEvent && isUserActive()) {
      clearLastEvent();
      lastEvent = null;
    }

    tray.setContextMenu(buildMenu());

    // Update title to show status
    // Priority: recent event > snoozing > muted > idle
    if (lastEvent) {
      tray.setTitle(getEventIcon(lastEvent.event));
    } else if (snoozeRemaining) {
      tray.setTitle('💤');
    } else if (config.mute) {
      tray.setTitle('🔇');
    } else {
      tray.setTitle('🔔');
    }
  }
}

app.whenReady().then(() => {
  // Hide dock icon
  app.dock?.hide();

  // Create tray with empty icon (we use title instead)
  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle('🔔');
  tray.setToolTip('claudeding');
  tray.setContextMenu(buildMenu());

  console.log('claudeding menu bar is ready');

  // Watch config for changes
  watchFile(CONFIG_PATH, { interval: 1000 }, () => {
    updateMenu();
  });

  // Watch last event file for changes (hook events)
  watchFile(LAST_EVENT_FILE, { interval: 500 }, () => {
    updateMenu();
  });

  // Regular update to catch snooze/event expiry
  setInterval(updateMenu, 2000);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
