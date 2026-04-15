import { loadConfig, updateConfig } from '../lib/config.js';

export default async function mute(options) {
  const config = loadConfig();

  if (options.toggle) {
    const newMute = !config.mute;
    updateConfig({ mute: newMute });
    console.log(newMute ? 'Sounds muted (notifications still active)' : 'Sounds unmuted');
  } else if (options.on) {
    updateConfig({ mute: true });
    console.log('Sounds muted (notifications still active)');
  } else if (options.off) {
    updateConfig({ mute: false });
    console.log('Sounds unmuted');
  } else {
    // Default: toggle
    const newMute = !config.mute;
    updateConfig({ mute: newMute });
    console.log(newMute ? 'Sounds muted (notifications still active)' : 'Sounds unmuted');
  }
}
