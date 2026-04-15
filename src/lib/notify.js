import { spawn } from 'child_process';
import { platform, homedir } from 'os';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { loadConfig } from './config.js';

const DEBOUNCE_FILE = join(homedir(), '.claudeding-lastnotify');
const DEBOUNCE_MS = 1500; // 1.5 seconds between notifications

function shouldDebounce() {
  try {
    if (!existsSync(DEBOUNCE_FILE)) return false;
    const lastNotify = parseInt(readFileSync(DEBOUNCE_FILE, 'utf-8'), 10);
    return Date.now() - lastNotify < DEBOUNCE_MS;
  } catch {
    return false;
  }
}

function markNotified() {
  try {
    writeFileSync(DEBOUNCE_FILE, Date.now().toString());
  } catch {
    // Ignore write errors
  }
}

const COMPLETE_MESSAGES = [
  '✅ Done!',
  '🎉 All done!',
  '✨ Finished!',
  '🚀 Complete!',
  '💪 Task crushed!',
  '🏁 Wrapped up!',
  '👍 Good to go!',
  '⚡ Done and dusted!',
  '🎯 Nailed it!',
  '🌟 All set!',
  '🔥 Shipped!',
  '✔️ Task complete!',
  '🙌 Finito!',
  '💫 Mission accomplished!',
  '🏆 Victory!'
];

const FEEDBACK_MESSAGES = [
  '👋 Need your input!',
  '🤔 Your turn!',
  '💬 Waiting on you!',
  '📝 Input needed!',
  '🎤 Over to you!',
  '👀 Take a look!',
  '🔔 Attention please!',
  '💭 What do you think?',
  '🙋 Quick question!',
  '⏸️ Paused for you!',
  '🎯 Decision time!',
  '💡 Need your call!',
  '🤝 Let\'s collaborate!',
  '📣 Hey there!',
  '⚠️ Waiting for input!'
];

function getRandomMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function getTerminalBundleId() {
  const termProgram = process.env.TERM_PROGRAM?.toLowerCase() || '';

  const bundleIds = {
    'apple_terminal': 'com.apple.Terminal',
    'iterm.app': 'com.googlecode.iterm2',
    'warp': 'dev.warp.Warp-Stable',
    'ghostty': 'com.mitchellh.ghostty',
    'alacritty': 'org.alacritty',
    'kitty': 'net.kovidgoyal.kitty',
    'hyper': 'co.zeit.hyper',
    'vscode': 'com.microsoft.VSCode',
    'cursor': 'com.todesktop.230313mzl4w4u92',
  };

  for (const [key, bundleId] of Object.entries(bundleIds)) {
    if (termProgram.includes(key)) {
      return bundleId;
    }
  }

  return 'com.apple.Terminal'; // Default fallback
}

function notifyMacOS(title, message) {
  return new Promise((resolve) => {
    const bundleId = getTerminalBundleId();

    // Try terminal-notifier first (better branding), fall back to osascript
    const tn = spawn('terminal-notifier', [
      '-title', title,
      '-message', message,
      '-sender', bundleId,
      '-ignoreDnD'
    ]);

    tn.on('error', () => {
      // terminal-notifier not installed, fall back to osascript
      const script = `display notification "${message}" with title "${title}"`;
      const proc = spawn('osascript', ['-e', script]);
      proc.on('close', resolve);
      proc.on('error', () => resolve());
    });

    tn.on('close', resolve);
  });
}

function notifyLinux(title, message) {
  return new Promise((resolve) => {
    const proc = spawn('notify-send', [title, message]);
    proc.on('close', resolve);
    proc.on('error', () => resolve());
  });
}

function notifyWindows(title, message) {
  return new Promise((resolve) => {
    // Using BurntToast if available, otherwise basic PowerShell toast
    const script = `
      $ErrorActionPreference = 'SilentlyContinue'
      if (Get-Command New-BurntToastNotification -ErrorAction SilentlyContinue) {
        New-BurntToastNotification -Text '${title}', '${message}'
      } else {
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
        $textNodes = $template.GetElementsByTagName('text')
        $textNodes.Item(0).AppendChild($template.CreateTextNode('${title}')) | Out-Null
        $textNodes.Item(1).AppendChild($template.CreateTextNode('${message}')) | Out-Null
        $toast = [Windows.UI.Notifications.ToastNotification]::new($template)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('claudeding').Show($toast)
      }
    `;
    const proc = spawn('powershell', ['-c', script]);
    proc.on('close', resolve);
    proc.on('error', () => resolve());
  });
}

export async function showNotification(event, projectName) {
  const config = loadConfig();

  if (!config.notify) {
    return;
  }

  // Debounce: skip if notified recently (prevents spam from multiple instances)
  if (shouldDebounce()) {
    return;
  }

  markNotified();

  const title = 'claudeding';
  const eventMessage = event === 'complete'
    ? getRandomMessage(COMPLETE_MESSAGES)
    : getRandomMessage(FEEDBACK_MESSAGES);
  const message = projectName ? `${projectName} — ${eventMessage}` : eventMessage;

  const os = platform();

  try {
    if (os === 'darwin') {
      await notifyMacOS(title, message);
    } else if (os === 'linux') {
      await notifyLinux(title, message);
    } else if (os === 'win32') {
      await notifyWindows(title, message);
    }
  } catch {
    // Silently fail - notifications are nice to have
  }
}
