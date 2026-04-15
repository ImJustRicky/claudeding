import { spawn, execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';
import { confirm } from '@inquirer/prompts';

const __dirname = dirname(fileURLToPath(import.meta.url));

function isElectronInstalled() {
  try {
    execSync('npx electron --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export default async function tray() {
  const os = platform();

  if (os !== 'darwin') {
    console.error('Menu bar widget is currently only supported on macOS.');
    console.log('Linux and Windows support coming soon.');
    process.exit(1);
  }

  // Check if electron is available
  if (!isElectronInstalled()) {
    console.log('The menu bar widget requires Electron.\n');

    const install = await confirm({
      message: 'Install Electron now? (this may take a minute)',
      default: true
    });

    if (!install) {
      console.log('Menu bar widget requires Electron. Run: npm install -g electron');
      process.exit(1);
    }

    console.log('\nInstalling Electron...');
    try {
      execSync('npm install -g electron', { stdio: 'inherit' });
      console.log('');
    } catch {
      console.error('Failed to install Electron. Try manually: npm install -g electron');
      process.exit(1);
    }
  }

  console.log('Starting claudeding menu bar...');
  console.log('The bell icon will appear in your menu bar.');
  console.log('');
  console.log('To quit: Click the icon and select "Quit Menu Bar"');
  console.log('');

  const trayMain = join(__dirname, '..', 'tray', 'main.js');

  // Spawn electron with our tray script
  const electron = spawn('npx', ['electron', trayMain], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '' }
  });

  electron.unref();

  console.log('Menu bar started! You can close this terminal.');
}
