import { app, Tray, Menu, nativeImage } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, watchFile, unlinkSync } from 'fs';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

const CONFIG_PATH = join(homedir(), '.claudeding.json');
const SNOOZE_FILE = join(homedir(), '.claudeding-snooze');
const LAST_EVENT_FILE = join(homedir(), '.claudeding-lastevent');

const EVENT_TIMEOUT = 30000;
const TICK_INTERVAL = 5000;
const ACTIVE_CACHE_TTL = 10000;

const TERMINAL_APPS = [
  'terminal', 'iterm', 'hyper', 'alacritty', 'kitty', 'warp',
  'wezterm', 'tabby', 'cursor', 'code', 'visual studio code',
  'zed', 'ghostty', 'rio',
];

let tray = null;
let lastSignature = null;
let activeCache = { value: false, fetchedAt: 0, inflight: null };

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

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
    if (Date.now() - data.time < EVENT_TIMEOUT) return data;
    return null;
  } catch {
    return null;
  }
}

function clearLastEvent() {
  try {
    if (existsSync(LAST_EVENT_FILE)) unlinkSync(LAST_EVENT_FILE);
  } catch {}
}

async function checkTerminalFocused() {
  try {
    const { stdout } = await execAsync(
      'lsappinfo info -only name "$(lsappinfo front)" 2>/dev/null || echo ""',
      { shell: '/bin/bash', timeout: 2000 },
    );
    const result = stdout.toLowerCase();
    return TERMINAL_APPS.some((a) => result.includes(a));
  } catch {
    return false;
  }
}

async function checkIdleSeconds() {
  try {
    const { stdout } = await execAsync(
      "ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print int($NF/1000000000); exit}'",
      { shell: '/bin/bash', timeout: 2000 },
    );
    return parseInt(stdout.trim(), 10) || 0;
  } catch {
    return 0;
  }
}

async function refreshUserActive() {
  const config = loadConfig();
  const afkTimeout = config.afkTimeout ?? 30;
  const [focused, idle] = await Promise.all([checkTerminalFocused(), checkIdleSeconds()]);
  return focused && idle < afkTimeout;
}

function getUserActiveCached() {
  const now = Date.now();
  if (now - activeCache.fetchedAt < ACTIVE_CACHE_TTL) return activeCache.value;
  if (!activeCache.inflight) {
    activeCache.inflight = refreshUserActive()
      .then((v) => {
        activeCache.value = v;
        activeCache.fetchedAt = Date.now();
      })
      .catch(() => {})
      .finally(() => {
        activeCache.inflight = null;
      });
  }
  return activeCache.value;
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
  exec(`claudeding ${cmd}`, (err) => {
    if (err) console.error('Command failed:', err.message);
  });
}

function getStatusText(config, snoozeRemaining) {
  if (snoozeRemaining) return `Snoozing (${snoozeRemaining})`;
  if (config.mute) return 'Muted';
  return 'Active';
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildMenu(state) {
  const { config, snoozeRemaining, lastEvent } = state;
  const isMuted = config.mute === true;
  const isSnoozing = snoozeRemaining !== null;

  const menuItems = [
    { label: `claudeding - ${getStatusText(config, snoozeRemaining)}`, enabled: false },
  ];

  if (lastEvent) {
    menuItems.push({
      label: `${getEventIcon(lastEvent.event)} ${lastEvent.event}${lastEvent.project ? ` (${lastEvent.project})` : ''} at ${formatTime(lastEvent.time)}`,
      enabled: false,
    });
  }

  return Menu.buildFromTemplate([
    ...menuItems,
    {
      label: isMuted ? '🔊 Unmute Sounds' : '🔇 Mute Sounds',
      click: () => {
        runCommand(isMuted ? 'mute --off' : 'mute --on');
        scheduleUpdate();
      },
    },
    { type: 'separator' },
    {
      label: 'Snooze',
      submenu: [
        { label: '15 minutes', click: () => { runCommand('snooze 15m'); scheduleUpdate(); } },
        { label: '30 minutes', click: () => { runCommand('snooze 30m'); scheduleUpdate(); } },
        { label: '1 hour', click: () => { runCommand('snooze 1h'); scheduleUpdate(); } },
        { label: '2 hours', click: () => { runCommand('snooze 2h'); scheduleUpdate(); } },
        { type: 'separator' },
        {
          label: isSnoozing ? `Cancel Snooze (${snoozeRemaining} left)` : 'Not snoozing',
          enabled: isSnoozing,
          click: () => { runCommand('snooze --off'); scheduleUpdate(); },
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Test Sounds',
      submenu: [
        { label: 'Play Complete', click: () => runCommand('play complete --force') },
        { label: 'Play Feedback', click: () => runCommand('play feedback --force') },
        { label: 'Play Error', click: () => runCommand('play error --force') },
      ],
    },
    { type: 'separator' },
    { label: 'Quit Menu Bar', click: () => app.quit() },
  ]);
}

function computeState() {
  const config = loadConfig();
  const snoozeRemaining = getSnoozeRemaining();
  let lastEvent = getLastEvent();
  if (lastEvent && getUserActiveCached()) {
    clearLastEvent();
    lastEvent = null;
  }
  return { config, snoozeRemaining, lastEvent };
}

function signatureOf(state) {
  const { config, snoozeRemaining, lastEvent } = state;
  return JSON.stringify({
    mute: !!config.mute,
    snooze: snoozeRemaining,
    event: lastEvent ? `${lastEvent.event}|${lastEvent.project ?? ''}|${lastEvent.time}` : null,
  });
}

function titleFor(state) {
  const { config, snoozeRemaining, lastEvent } = state;
  if (lastEvent) return getEventIcon(lastEvent.event);
  if (snoozeRemaining) return '💤';
  if (config.mute) return '🔇';
  return '🔔';
}

let pendingUpdate = null;
function scheduleUpdate() {
  if (pendingUpdate) return;
  pendingUpdate = setImmediate(() => {
    pendingUpdate = null;
    updateMenu();
  });
}

function updateMenu() {
  if (!tray) return;
  const state = computeState();
  const sig = signatureOf(state);
  if (sig === lastSignature) return;
  lastSignature = sig;
  tray.setContextMenu(buildMenu(state));
  tray.setTitle(titleFor(state));
}

app.whenReady().then(() => {
  app.dock?.hide();

  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('claudeding');

  const state = computeState();
  lastSignature = signatureOf(state);
  tray.setContextMenu(buildMenu(state));
  tray.setTitle(titleFor(state));

  console.log('claudeding menu bar is ready');

  watchFile(CONFIG_PATH, { interval: 1000 }, scheduleUpdate);
  watchFile(LAST_EVENT_FILE, { interval: 500 }, scheduleUpdate);

  setInterval(updateMenu, TICK_INTERVAL);
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('second-instance', () => {});
