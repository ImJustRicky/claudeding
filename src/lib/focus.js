import { execSync } from 'child_process';
import { platform } from 'os';

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

function isFocusedMacOS() {
  // Use lsappinfo which works better in subprocess contexts than osascript
  try {
    const frontApp = execSync('lsappinfo info -only name $(lsappinfo front) 2>/dev/null', {
      encoding: 'utf-8',
      shell: true
    }).toLowerCase();

    // Check if it's a terminal or Claude Code
    const terminalApps = [
      'terminal',
      'iterm',
      'hyper',
      'alacritty',
      'kitty',
      'warp',
      'wezterm',
      'tabby',
      'cursor',
      'code',
      'visual studio code',
      'zed',
      'ghostty',
    ];

    return terminalApps.some(app => frontApp.includes(app));
  } catch {
    // Fallback to osascript if lsappinfo fails
    const script = 'tell application "System Events" to get name of first application process whose frontmost is true';
    const result = execSync(`osascript -e '${script}'`, { encoding: 'utf-8' }).trim().toLowerCase();

    const terminalApps = [
      'terminal', 'iterm', 'hyper', 'alacritty', 'kitty', 'warp',
      'wezterm', 'tabby', 'cursor', 'code', 'visual studio code', 'zed', 'ghostty'
    ];

    return terminalApps.some(app => result.includes(app));
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
