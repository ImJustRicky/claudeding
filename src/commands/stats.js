import { existsSync, readFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { loadConfig, updateConfig } from '../lib/config.js';

const HISTORY_FILE = join(homedir(), '.claudeding-history.jsonl');

function loadHistory() {
  if (!existsSync(HISTORY_FILE)) return [];

  try {
    const content = readFileSync(HISTORY_FILE, 'utf-8').trim();
    if (!content) return [];

    return content.split('\n').map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function filterByTime(events, hours) {
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  return events.filter(e => e.time >= cutoff);
}

function countByType(events) {
  const counts = { complete: 0, feedback: 0, error: 0 };
  events.forEach(e => {
    if (counts[e.event] !== undefined) counts[e.event]++;
  });
  return counts;
}

function countByProject(events) {
  const counts = {};
  events.forEach(e => {
    const proj = e.project || 'unknown';
    counts[proj] = (counts[proj] || 0) + 1;
  });
  return counts;
}

function countByHour(events) {
  const counts = {};
  events.forEach(e => {
    const hour = new Date(e.time).getHours();
    counts[hour] = (counts[hour] || 0) + 1;
  });
  return counts;
}

function avgTimeBetween(events, type) {
  const filtered = events.filter(e => e.event === type).sort((a, b) => a.time - b.time);
  if (filtered.length < 2) return null;

  let totalGap = 0;
  for (let i = 1; i < filtered.length; i++) {
    totalGap += filtered[i].time - filtered[i - 1].time;
  }
  return totalGap / (filtered.length - 1);
}

function formatDuration(ms) {
  if (!ms) return 'N/A';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function getPeakHour(hourCounts) {
  let max = 0;
  let peakHour = null;
  for (const [hour, count] of Object.entries(hourCounts)) {
    if (count > max) {
      max = count;
      peakHour = parseInt(hour);
    }
  }
  if (peakHour === null) return 'N/A';
  const ampm = peakHour >= 12 ? 'PM' : 'AM';
  const h = peakHour % 12 || 12;
  return `${h}${ampm}`;
}

export default async function stats(options) {
  const config = loadConfig();

  // Handle --on/--off flags
  if (options?.on) {
    updateConfig({ logStats: true });
    console.log('Stats logging enabled. Events will be logged to ~/.claudeding-history.jsonl');
    return;
  }

  if (options?.off) {
    updateConfig({ logStats: false });
    console.log('Stats logging disabled.');
    return;
  }

  if (!config.logStats) {
    console.log('Stats logging is disabled.\n');
    console.log('Enable with: claudeding stats --on');
    return;
  }

  const allEvents = loadHistory();

  if (allEvents.length === 0) {
    console.log('No events recorded yet.\n');
    console.log('Stats will appear here after Claude Code triggers some hooks.');
    return;
  }

  const today = filterByTime(allEvents, 24);
  const week = filterByTime(allEvents, 24 * 7);
  const month = filterByTime(allEvents, 24 * 30);

  const todayCounts = countByType(today);
  const weekCounts = countByType(week);
  const monthCounts = countByType(month);

  const projectCounts = countByProject(allEvents);
  const hourCounts = countByHour(allEvents);

  const avgFeedbackGap = avgTimeBetween(allEvents, 'feedback');
  const errorRate = allEvents.length > 0
    ? ((countByType(allEvents).error / allEvents.length) * 100).toFixed(1)
    : 0;

  // Top projects
  const topProjects = Object.entries(projectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('claudeding Stats\n');

  console.log('Events:');
  console.log(`  Today:    ${todayCounts.complete} complete, ${todayCounts.feedback} feedback, ${todayCounts.error} errors`);
  console.log(`  This week: ${weekCounts.complete} complete, ${weekCounts.feedback} feedback, ${weekCounts.error} errors`);
  console.log(`  This month: ${monthCounts.complete} complete, ${monthCounts.feedback} feedback, ${monthCounts.error} errors`);
  console.log(`  All time: ${allEvents.length} total events`);
  console.log('');

  console.log('Insights:');
  console.log(`  Avg time between feedback: ${formatDuration(avgFeedbackGap)}`);
  console.log(`  Error rate: ${errorRate}%`);
  console.log(`  Peak coding hour: ${getPeakHour(hourCounts)}`);
  console.log('');

  if (topProjects.length > 0) {
    console.log('Top Projects:');
    topProjects.forEach(([proj, count], i) => {
      console.log(`  ${i + 1}. ${proj} (${count} events)`);
    });
    console.log('');
  }

  // File size info
  if (existsSync(HISTORY_FILE)) {
    const size = statSync(HISTORY_FILE).size;
    const kb = (size / 1024).toFixed(1);
    console.log(`History file: ${kb} KB (${allEvents.length} events)`);
  }
}
