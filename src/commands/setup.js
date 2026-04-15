import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { installHooks } from '../lib/hooks.js';
import { updateConfig, getConfigPath } from '../lib/config.js';

const CLAUDE_MD_PATH = join(homedir(), '.claude', 'CLAUDE.md');
const CLAUDEDING_MARKER = '<!-- claudeding -->';

const CLAUDEDING_INSTRUCTIONS = `
${CLAUDEDING_MARKER}
## claudeding - Audio Notifications

claudeding plays sounds when you complete tasks or need user input.

| User says | Run this |
|-----------|----------|
| "mute" / "quiet" / "shush" | \`claudeding mute --on\` |
| "unmute" / "sounds on" | \`claudeding mute --off\` |
| "change sound" | \`claudeding sounds\` |
| "test ding" | \`claudeding play complete\` |
${CLAUDEDING_MARKER}
`;

function addToGlobalClaudeMd() {
  const claudeDir = join(homedir(), '.claude');

  // Ensure .claude directory exists
  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  let content = '';
  if (existsSync(CLAUDE_MD_PATH)) {
    content = readFileSync(CLAUDE_MD_PATH, 'utf-8');

    // Check if already added
    if (content.includes(CLAUDEDING_MARKER)) {
      return false; // Already present
    }
  }

  // Append claudeding instructions
  content = content.trimEnd() + '\n' + CLAUDEDING_INSTRUCTIONS;
  writeFileSync(CLAUDE_MD_PATH, content);
  return true;
}

export default async function setup(options) {
  console.log('Setting up claudeding...\n');

  // Update config with custom sounds if provided
  const soundUpdates = {};
  if (options.completeSound) {
    if (!existsSync(options.completeSound)) {
      console.error(`Error: Sound file not found: ${options.completeSound}`);
      process.exit(1);
    }
    soundUpdates.complete = options.completeSound;
  }
  if (options.feedbackSound) {
    if (!existsSync(options.feedbackSound)) {
      console.error(`Error: Sound file not found: ${options.feedbackSound}`);
      process.exit(1);
    }
    soundUpdates.feedback = options.feedbackSound;
  }

  if (Object.keys(soundUpdates).length > 0) {
    updateConfig({ sounds: soundUpdates });
    console.log('Custom sounds configured.');
  }

  // Install hooks
  const { settingsPath, backedUp, backupPath } = installHooks();

  if (backedUp) {
    console.log(`Backed up existing settings to:\n  ${backupPath}\n`);
  }

  console.log(`Hooks installed in:\n  ${settingsPath}\n`);

  // Add to global CLAUDE.md
  const addedToClaudeMd = addToGlobalClaudeMd();
  if (addedToClaudeMd) {
    console.log(`Added instructions to:\n  ${CLAUDE_MD_PATH}\n`);
  }

  console.log(`Config file:\n  ${getConfigPath()}\n`);
  console.log('Done! You will now hear notifications when Claude Code:');
  console.log('  - Completes a task (ding!)');
  console.log('  - Needs your input (different ding!)');
  console.log('  - Encounters an error (alert sound!)\n');
  console.log('Run "claudeding play complete", "claudeding play feedback", or "claudeding play error" to test.');
  console.log('Say "mute" to Claude and it will know to run "claudeding mute".');
}
