import * as p from '@clack/prompts';
import { playSound, getBundledSounds, setSelectedSound, getSelectedSounds } from '../lib/audio.js';

export default async function sounds() {
  const bundled = getBundledSounds();
  const current = getSelectedSounds();

  if (bundled.complete.length === 0 && bundled.feedback.length === 0 && bundled.error.length === 0) {
    p.log.warn('No bundled sounds found');
    return;
  }

  while (true) {
    const eventType = await p.select({
      message: 'Which sound to configure?',
      options: [
        { value: 'complete', label: 'Task complete', hint: current.complete || 'default' },
        { value: 'feedback', label: 'Needs input', hint: current.feedback || 'default' },
        { value: 'error', label: 'Error', hint: current.error || 'default' },
        { value: 'back', label: 'Back' }
      ]
    });

    if (p.isCancel(eventType) || eventType === 'back') {
      return;
    }

    const sounds = bundled[eventType];
    if (!sounds || sounds.length === 0) {
      p.log.warn(`No sounds for ${eventType}`);
      continue;
    }

    const options = [
      ...sounds.map(s => ({
        value: s.name,
        label: s.name,
        hint: current[eventType] === s.name ? 'current' : undefined
      })),
      { value: 'back', label: 'Back' }
    ];

    const soundChoice = await p.select({
      message: `Pick ${eventType} sound:`,
      options
    });

    if (p.isCancel(soundChoice) || soundChoice === 'back') {
      continue;
    }

    // Preview
    const preview = await p.confirm({
      message: 'Preview this sound?',
      initialValue: true
    });

    if (preview && !p.isCancel(preview)) {
      await playSound(eventType, soundChoice, { force: true });
    }

    // Confirm
    const useIt = await p.confirm({
      message: `Use "${soundChoice}" for ${eventType}?`,
      initialValue: true
    });

    if (useIt && !p.isCancel(useIt)) {
      setSelectedSound(eventType, soundChoice);
      p.log.success(`Set ${eventType} sound to: ${soundChoice}`);
    }
  }
}
