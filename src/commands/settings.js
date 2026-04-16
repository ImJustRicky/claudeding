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

    const webhookCount = config.webhooks?.length || 0;

    const choice = await p.select({
      message: 'What would you like to configure?',
      options: [
        { value: 'volume', label: `Volume: ${config.volume ?? 100}%`, hint: 'How loud notifications play' },
        { value: 'sounds', label: 'Pick sounds', hint: 'Choose different notification sounds' },
        { value: 'preview', label: 'Preview sounds', hint: 'Test all notification sounds' },
        { value: 'focus', label: `Skip when focused: ${config.skipWhenFocused !== false ? 'on' : 'off'}`, hint: 'No sound if terminal is visible' },
        { value: 'afk', label: `AFK override: ${config.afkTimeout > 0 ? config.afkTimeout + 's' : 'off'}`, hint: 'Play anyway if idle this long' },
        { value: 'quietHours', label: `Quiet hours: ${config.quietHours?.enabled ? config.quietHours.start + '-' + config.quietHours.end : 'off'}`, hint: 'Auto-mute during set hours' },
        { value: 'dnd', label: `Respect system DND: ${config.respectDnd ? 'on' : 'off'}`, hint: 'Mute when macOS Focus is on' },
        { value: 'webhooks', label: `Webhooks: ${webhookCount > 0 ? webhookCount + ' configured' : 'none'}`, hint: 'Slack/Discord notifications' },
        { value: 'messages', label: 'Custom messages', hint: 'Set your own notification text' },
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

      case 'preview':
        p.log.info('Playing all sounds...');
        p.log.step('Complete sound:');
        await playSound('complete', null, { force: true });
        await new Promise(r => setTimeout(r, 1500));
        p.log.step('Feedback sound:');
        await playSound('feedback', null, { force: true });
        await new Promise(r => setTimeout(r, 1500));
        p.log.step('Error sound:');
        await playSound('error', null, { force: true });
        p.log.success('Done!');
        break;

      case 'webhooks':
        const webhooks = config.webhooks || [];
        const webhookAction = await p.select({
          message: 'Webhook settings',
          options: [
            { value: 'add', label: 'Add webhook', hint: 'Slack or Discord URL' },
            { value: 'list', label: 'List webhooks', hint: `${webhooks.length} configured` },
            { value: 'clear', label: 'Clear all webhooks' },
            { value: 'back', label: 'Back' }
          ]
        });

        if (p.isCancel(webhookAction) || webhookAction === 'back') break;

        if (webhookAction === 'add') {
          const url = await p.text({
            message: 'Webhook URL:',
            placeholder: 'https://hooks.slack.com/... or https://discord.com/api/webhooks/...',
            validate: (v) => {
              if (!v.startsWith('http')) return 'Must be a URL';
            }
          });
          if (!p.isCancel(url)) {
            updateConfig({ webhooks: [...webhooks, url] });
            p.log.success('Webhook added!');
          }
        } else if (webhookAction === 'list') {
          if (webhooks.length === 0) {
            p.log.info('No webhooks configured');
          } else {
            webhooks.forEach((w, i) => {
              const url = typeof w === 'string' ? w : w.url;
              const type = url.includes('slack') ? 'Slack' : url.includes('discord') ? 'Discord' : 'Generic';
              p.log.info(`${i + 1}. [${type}] ${url.substring(0, 50)}...`);
            });
          }
        } else if (webhookAction === 'clear') {
          const confirm = await p.confirm({ message: 'Remove all webhooks?' });
          if (confirm && !p.isCancel(confirm)) {
            updateConfig({ webhooks: [] });
            p.log.success('All webhooks removed');
          }
        }
        break;

      case 'messages':
        const msgEvent = await p.select({
          message: 'Which event to customize?',
          options: [
            { value: 'complete', label: 'Complete messages' },
            { value: 'feedback', label: 'Feedback messages' },
            { value: 'error', label: 'Error messages' },
            { value: 'reset', label: 'Reset to defaults' },
            { value: 'back', label: 'Back' }
          ]
        });

        if (p.isCancel(msgEvent) || msgEvent === 'back') break;

        if (msgEvent === 'reset') {
          updateConfig({ customMessages: null });
          p.log.success('Reset to default messages');
          break;
        }

        const currentMsgs = config.customMessages?.[msgEvent] || [];
        p.log.info(`Current: ${currentMsgs.length > 0 ? currentMsgs.join(', ') : 'using defaults'}`);

        const newMsg = await p.text({
          message: 'Enter custom messages (comma-separated):',
          placeholder: 'Done!, All set!, Finished!',
          initialValue: currentMsgs.join(', ')
        });

        if (!p.isCancel(newMsg) && newMsg.trim()) {
          const messages = newMsg.split(',').map(m => m.trim()).filter(Boolean);
          const customMessages = config.customMessages || {};
          customMessages[msgEvent] = messages;
          updateConfig({ customMessages });
          p.log.success(`Set ${messages.length} custom messages for ${msgEvent}`);
        }
        break;
    }
  }
}
