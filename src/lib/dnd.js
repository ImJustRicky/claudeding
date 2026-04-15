import { execSync } from 'child_process';
import { platform } from 'os';
import { loadConfig } from './config.js';

// Check if system Do Not Disturb / Focus mode is active
export function isDndActive() {
  const config = loadConfig();

  // If respectDnd is false (default), always return false (play sounds)
  if (config.respectDnd !== true) {
    return false;
  }

  const os = platform();

  try {
    if (os === 'darwin') {
      return isMacOSDndActive();
    } else if (os === 'win32') {
      return isWindowsDndActive();
    }
    // Linux doesn't have a standard DND API
    return false;
  } catch {
    return false;
  }
}

function isMacOSDndActive() {
  try {
    // Check Focus mode status via defaults
    // This checks the "Focus" feature introduced in macOS Monterey
    const result = execSync(
      'defaults read com.apple.controlcenter "NSStatusItem Visible FocusModes" 2>/dev/null || echo "0"',
      { encoding: 'utf-8', shell: '/bin/bash' }
    ).trim();

    // Also check the older DND setting
    const dndResult = execSync(
      'defaults -currentHost read com.apple.notificationcenterui doNotDisturb 2>/dev/null || echo "0"',
      { encoding: 'utf-8', shell: '/bin/bash' }
    ).trim();

    // Check if any Focus mode is active using the Focus status
    const focusResult = execSync(
      'plutil -extract data.0.storeAssertionRecords json -o - ~/Library/DoNotDisturb/DB/Assertions.json 2>/dev/null | grep -c "." || echo "0"',
      { encoding: 'utf-8', shell: '/bin/bash' }
    ).trim();

    return result === '1' || dndResult === '1' || parseInt(focusResult, 10) > 0;
  } catch {
    return false;
  }
}

function isWindowsDndActive() {
  try {
    // Check Windows Focus Assist status
    const script = `
      $key = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CloudStore\\Store\\DefaultAccount\\Current\\default$windows.immersivecontrolcenter_cw5n1h2txyewy!microsoft.windows.immersivecontrolcenter_Microsoft.QuietHoursProfile.Int'
      if (Test-Path $key) {
        $val = (Get-ItemProperty -Path $key -Name Data -ErrorAction SilentlyContinue).Data
        if ($val -and $val[28] -ne 0) { 'active' } else { 'inactive' }
      } else { 'inactive' }
    `;
    const result = execSync(`powershell -c "${script}"`, { encoding: 'utf-8' }).trim();
    return result === 'active';
  } catch {
    return false;
  }
}
