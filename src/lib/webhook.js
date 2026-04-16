import { loadConfig } from './config.js';

// Send webhook notification
export async function sendWebhooks(event, projectName, message) {
  const config = loadConfig();
  const webhooks = config.webhooks || [];

  if (webhooks.length === 0) return;

  const payload = {
    event,
    project: projectName || 'unknown',
    message,
    timestamp: new Date().toISOString()
  };

  await Promise.all(webhooks.map(webhook => sendToWebhook(webhook, payload)));
}

async function sendToWebhook(webhook, payload) {
  try {
    const url = typeof webhook === 'string' ? webhook : webhook.url;
    const type = detectWebhookType(url, webhook.type);

    const body = formatPayload(type, payload);

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    // Silently fail - webhooks are nice to have
  }
}

function detectWebhookType(url, explicitType) {
  if (explicitType) return explicitType;
  if (url.includes('slack.com')) return 'slack';
  if (url.includes('discord.com') || url.includes('discordapp.com')) return 'discord';
  return 'generic';
}

function formatPayload(type, payload) {
  const icon = payload.event === 'complete' ? '✅' :
               payload.event === 'error' ? '❌' : '👋';

  switch (type) {
    case 'slack':
      return {
        text: `${icon} *claudeding* - ${payload.project}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${icon} *${payload.message}*\nProject: \`${payload.project}\``
            }
          }
        ]
      };

    case 'discord':
      return {
        content: `${icon} **claudeding** - ${payload.project}`,
        embeds: [{
          title: payload.message,
          description: `Project: ${payload.project}`,
          color: payload.event === 'complete' ? 0x00ff00 :
                 payload.event === 'error' ? 0xff0000 : 0xffaa00,
          timestamp: payload.timestamp
        }]
      };

    default:
      return payload;
  }
}
