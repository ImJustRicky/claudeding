import * as p from '@clack/prompts';
import { loadConfig, updateConfig } from '../lib/config.js';
import { playSound } from '../lib/audio.js';

export default async function settings() {
  p.intro('claudeding settings');

  while (true) {
    const config = loadConfig();
    const { checkHooksInstalled } = await import('../lib/hooks.js');
    const hooks = checkHooksInstalled();
    const thinkingEnabled = hooks.userPromptSubmit;

    const choice = await p.select({
      message: 'What would you like to configure?',
      options: [
        { value: 'volume', label: `Volume: ${config.volume ?? 100}%`, hint: 'How loud notifications play' },
        { value: 'sounds', label: 'Pick sounds', hint: 'Choose different notification sounds' },
        { value: 'focus', label: `Skip when focused: ${config.skipWhenFocused !== false ? 'on' : 'off'}`, hint: 'No sound if terminal is visible' },
        { value: 'afk', label: `AFK override: ${config.afkTimeout > 0 ? config.afkTimeout + 's' : 'off'}`, hint: 'Play anyway if idle this long' },
        { value: 'quietHours', label: `Quiet hours: ${config.quietHours?.enabled ? config.quietHours.start + '-' + config.quietHours.end : 'off'}`, hint: 'Auto-mute during set hours' },
        { value: 'dnd', label: `Respect system DND: ${config.respectDnd ? 'on' : 'off'}`, hint: 'Mute when macOS Focus is on' },
        { value: 'thinking', label: `Jeopardy thinking music: ${thinkingEnabled ? 'on' : 'off'}`, hint: 'Play music while Claude thinks' },
        { value: 'easterEggs', label: `Fart easter eggs: ${config.easterEggs ? 'on' : 'off'}`, hint: '1% chance of a fart sound' },
        { value: 'stats', label: `Usage stats: ${config.logStats ? 'on' : 'off'}`, hint: 'Log events for statistics' },
        { value: 'done', label: 'Exit' }
      ]
    });

    if (p.isCancel(choice) || choice === 'done') {
      p.outro('Settings saved!');
      return;
    }

    switch (choice) {
      case 'volume':
        const vol = await p.text({
          message: 'Volume (0-100):',
          initialValue: String(config.volume ?? 100),
          validate: (v) => {
            const n = parseInt(v);
            if (isNaN(n) || n < 0 || n > 100) return 'Enter 0-100';
          }
        });
        if (!p.isCancel(vol)) {
          updateConfig({ volume: parseInt(vol) });
          const test = await p.confirm({ message: 'Test it?' });
          if (test && !p.isCancel(test)) {
            await playSound('complete', null, { force: true });
          }
        }
        break;

      case 'sounds':
        const soundsCmd = await import('./sounds.js');
        await soundsCmd.default();
        break;

      case 'focus':
        const newFocus = !(config.skipWhenFocused !== false);
        updateConfig({ skipWhenFocused: newFocus });
        p.log.success(`Skip when focused: ${newFocus ? 'on' : 'off'}`);
        break;

      case 'afk':
        p.log.info('Play sound if idle this long, even when focused');
        const afk = await p.text({
          message: 'Seconds (0 = off):',
          initialValue: String(config.afkTimeout ?? 30),
          validate: (v) => {
            const n = parseInt(v);
            if (isNaN(n) || n < 0) return 'Enter 0 or more';
          }
        });
        if (!p.isCancel(afk)) {
          updateConfig({ afkTimeout: parseInt(afk) });
        }
        break;

      case 'quietHours':
        const qh = config.quietHours || {};
        const qhEnabled = await p.confirm({
          message: 'Enable quiet hours?',
          initialValue: qh.enabled || false
        });
        if (p.isCancel(qhEnabled)) break;
        if (!qhEnabled) {
          updateConfig({ quietHours: { enabled: false } });
        } else {
          const start = await p.text({
            message: 'Start time (e.g., 22:00):',
            initialValue: qh.start || '22:00'
          });
          if (p.isCancel(start)) break;
          const end = await p.text({
            message: 'End time (e.g., 08:00):',
            initialValue: qh.end || '08:00'
          });
          if (p.isCancel(end)) break;
          updateConfig({ quietHours: { enabled: true, start, end } });
        }
        break;

      case 'dnd':
        const newDnd = !config.respectDnd;
        updateConfig({ respectDnd: newDnd });
        p.log.success(`Respect system DND: ${newDnd ? 'on' : 'off'}`);
        break;

      case 'thinking':
        const { enable, disable } = await import('./toggle.js');
        if (thinkingEnabled) {
          await disable('thinking');
        } else {
          await enable('thinking');
        }
        break;

      case 'easterEggs':
        const newEggs = !config.easterEggs;
        updateConfig({ easterEggs: newEggs });
        p.log.success(`Fart easter eggs: ${newEggs ? 'on' : 'off'}`);
        break;

      case 'stats':
        const newStats = !config.logStats;
        updateConfig({ logStats: newStats });
        p.log.success(`Usage stats: ${newStats ? 'on' : 'off'}`);
        break;
    }
  }
}
