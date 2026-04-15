import { execSync } from 'child_process';
import { platform } from 'os';
import { loadConfig } from './config.js';

// Check if Claude Code / terminal is currently focused
// Returns true if focused (should skip sound), false otherwise
export function isClaudeCodeFocused() {
  const os = platform();

  try {
    if (os === 'darwin') {
      return isFocusedMacOS();
    } else if (os === 'linux') {
      return isFocusedLinux();
    } else if (os === 'win32') {
      return isFocusedWindows();
    }
  } catch {
    // If we can't detect, assume not focused (play sound)
    return false;
  }

  return false;
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

function isFocusedMacOS() {
  const terminalApps = [
    'terminal', 'iterm', 'hyper', 'alacritty', 'kitty', 'warp',
    'wezterm', 'tabby', 'cursor', 'code', 'visual studio code',
    'zed', 'ghostty', 'rio'
  ];

  // Try multiple methods to detect frontmost app
  try {
    let isFocused = false;

    // Method 1: lsappinfo (most reliable in subprocesses)
    const lsResult = execSync(
      'lsappinfo info -only name "$(lsappinfo front)" 2>/dev/null || echo ""',
      { encoding: 'utf-8', shell: '/bin/bash' }
    ).toLowerCase();

    if (lsResult && terminalApps.some(app => lsResult.includes(app))) {
      isFocused = true;
    }

    // Method 2: osascript with System Events (fallback)
    if (!isFocused) {
      const asResult = execSync(
        `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true' 2>/dev/null || echo ""`,
        { encoding: 'utf-8', shell: '/bin/bash' }
      ).toLowerCase().trim();

      if (asResult && terminalApps.some(app => asResult.includes(app))) {
        isFocused = true;
      }
    }

    // If terminal is focused but user is AFK, play sound anyway
    if (isFocused) {
      const config = loadConfig();
      const idleSeconds = getIdleSeconds();
      const afkTimeout = config.afkTimeout ?? 30;
      if (afkTimeout > 0 && idleSeconds >= afkTimeout) {
        return false; // AFK, play sound
      }
    }

    return isFocused;
  } catch {
    return false;
  }
}

function isFocusedLinux() {
  // Try xdotool to get active window name
  try {
    const windowName = execSync('xdotool getactivewindow getwindowname 2>/dev/null', { encoding: 'utf-8' }).trim().toLowerCase();

    const terminalPatterns = [
      'terminal',
      'konsole',
      'gnome-terminal',
      'xterm',
      'alacritty',
      'kitty',
      'tilix',
      'terminator',
      'code',
      'cursor',
    ];

    return terminalPatterns.some(pattern => windowName.includes(pattern));
  } catch {
    return false;
  }
}

function isFocusedWindows() {
  // Get foreground window title using PowerShell
  try {
    const script = `
      Add-Type @"
        using System;
        using System.Runtime.InteropServices;
        public class Window {
          [DllImport("user32.dll")]
          public static extern IntPtr GetForegroundWindow();
          [DllImport("user32.dll")]
          public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
        }
"@
      $hwnd = [Window]::GetForegroundWindow()
      $sb = New-Object System.Text.StringBuilder 256
      [Window]::GetWindowText($hwnd, $sb, 256) | Out-Null
      $sb.ToString()
    `;

    const result = execSync(`powershell -c "${script}"`, { encoding: 'utf-8' }).trim().toLowerCase();

    const terminalPatterns = [
      'cmd',
      'powershell',
      'windows terminal',
      'command prompt',
      'code',
      'cursor',
      'visual studio',
    ];

    return terminalPatterns.some(pattern => result.includes(pattern));
  } catch {
    return false;
  }
}
