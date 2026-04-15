import { select, confirm } from '@inquirer/prompts';
import { readdirSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { playSound, getBundledSounds, setSelectedSound, getSelectedSounds } from '../lib/audio.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = join(__dirname, '..', 'audio');

export default async function sounds() {
  console.log('claudeding Sound Configuration\n');

  const bundled = getBundledSounds();
  const current = getSelectedSounds();

  if (bundled.complete.length === 0 && bundled.feedback.length === 0) {
    console.log('No bundled sounds found in src/audio/');
    console.log('Add WAV files to src/audio/complete/ and src/audio/feedback/');
    console.log('\nSee src/audio/README.md for instructions.');
    return;
  }

  // Configure complete sound
  if (bundled.complete.length > 0) {
    console.log('--- Task Complete Sound ---\n');

    const completeChoice = await select({
      message: 'Select sound for task completion:',
      choices: [
        ...bundled.complete.map(s => ({
          name: s.name + (current.complete === s.name ? ' (current)' : ''),
          value: s.name,
          description: s.file
        })),
        { name: 'Custom file...', value: '__custom__' }
      ]
    });

    if (completeChoice !== '__custom__') {
      const preview = await confirm({
        message: 'Preview this sound?',
        default: true
      });

      if (preview) {
        await playSound('complete', completeChoice);
      }

      const useIt = await confirm({
        message: `Use "${completeChoice}" for task completion?`,
        default: true
      });

      if (useIt) {
        setSelectedSound('complete', completeChoice);
        console.log(`\nSet complete sound to: ${completeChoice}`);
      }
    } else {
      console.log('\nTo use a custom sound, edit ~/.claudeding.json');
      console.log('Set sounds.complete to your file path.');
    }
  }

  console.log('');

  // Configure feedback sound
  if (bundled.feedback.length > 0) {
    console.log('--- Waiting for Input Sound ---\n');

    const feedbackChoice = await select({
      message: 'Select sound for feedback needed:',
      choices: [
        ...bundled.feedback.map(s => ({
          name: s.name + (current.feedback === s.name ? ' (current)' : ''),
          value: s.name,
          description: s.file
        })),
        { name: 'Custom file...', value: '__custom__' }
      ]
    });

    if (feedbackChoice !== '__custom__') {
      const preview = await confirm({
        message: 'Preview this sound?',
        default: true
      });

      if (preview) {
        await playSound('feedback', feedbackChoice);
      }

      const useIt = await confirm({
        message: `Use "${feedbackChoice}" for feedback?`,
        default: true
      });

      if (useIt) {
        setSelectedSound('feedback', feedbackChoice);
        console.log(`\nSet feedback sound to: ${feedbackChoice}`);
      }
    } else {
      console.log('\nTo use a custom sound, edit ~/.claudeding.json');
      console.log('Set sounds.feedback to your file path.');
    }
  }

  console.log('\nDone! Run "claudeding config" to see current settings.');
}
