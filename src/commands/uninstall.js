import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { uninstallHooks } from '../lib/hooks.js';

const CLAUDE_MD_PATH = join(homedir(), '.claude', 'CLAUDE.md');
const CLAUDEDING_MARKER = '<!-- claudeding -->';

function removeFromGlobalClaudeMd() {
  if (!existsSync(CLAUDE_MD_PATH)) {
    return false;
  }

  let content = readFileSync(CLAUDE_MD_PATH, 'utf-8');

  if (!content.includes(CLAUDEDING_MARKER)) {
    return false;
  }

  // Remove everything between the markers (inclusive)
  const regex = new RegExp(`\\n?${CLAUDEDING_MARKER}[\\s\\S]*?${CLAUDEDING_MARKER}\\n?`, 'g');
  content = content.replace(regex, '\n');
  content = content.trimEnd() + '\n';

  writeFileSync(CLAUDE_MD_PATH, content);
  return true;
}

export default async function uninstall() {
  console.log('Uninstalling claudeding...\n');

  const { removed, settingsPath } = uninstallHooks();

  if (removed) {
    console.log(`Removed claudeding hooks from:\n  ${settingsPath}\n`);
  } else {
    console.log('No claudeding hooks found to remove.');
  }

  const removedFromClaudeMd = removeFromGlobalClaudeMd();
  if (removedFromClaudeMd) {
    console.log(`Removed instructions from:\n  ${CLAUDE_MD_PATH}\n`);
  }

  console.log('Note: Your ~/.claudeding.json config file was not removed.');
}
