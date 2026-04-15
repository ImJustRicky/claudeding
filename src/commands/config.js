import { loadConfig, getConfigPath } from '../lib/config.js';
import { checkHooksInstalled } from '../lib/hooks.js';

export default async function config() {
  const configPath = getConfigPath();
  const currentConfig = loadConfig();
  const hooks = checkHooksInstalled();

  console.log('claudeding configuration\n');
  console.log(`Config file: ${configPath}\n`);
  console.log('Current settings:');
  console.log(JSON.stringify(currentConfig, null, 2));
  console.log('\nHooks installed:');
  console.log(`  UserPromptSubmit (thinking): ${hooks.userPromptSubmit ? 'yes' : 'no'}`);
  console.log(`  Notification (feedback): ${hooks.notification ? 'yes' : 'no'}`);
  console.log(`  Stop (complete): ${hooks.stop ? 'yes' : 'no'}`);
  console.log(`  PostToolUseFailure (error): ${hooks.postToolUseFailure ? 'yes' : 'no'}`);
}
