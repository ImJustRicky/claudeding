# claudeding

Audio notifications for Claude Code. Hear a sound when Claude completes a task or needs your input.

> *claudeding is not affiliated with or endorsed by Anthropic.*

## Installation

```bash
# Install globally
npm install -g @byricky/claudeding
claudeding setup

# Or use npx
npx @byricky/claudeding setup
```

## What it does

Once set up, you'll hear:
- A **completion sound** when Claude finishes a task
- A **feedback sound** when Claude is waiting for your input
- An **error sound** when a tool fails

You'll also see a system notification showing which project triggered it.

### Smart Features

- **Focus detection**: No sound when you're looking at the terminal (you can already see it)
- **AFK detection**: Plays sound if you've been idle 30+ seconds, even if terminal is focused
- **Debouncing**: Multiple Claude instances won't spam you with sounds
- **Random messages**: Fun notifications with emojis like "🎉 All done!" and "👋 Need your input!"
- **Custom messages**: Set your own notification text
- **Volume control**: Adjust notification volume (0-100)
- **Quiet hours**: Automatically mute sounds during specified hours
- **Snooze**: Temporarily pause sounds (`claudeding snooze 30m`)
- **Menu bar widget**: Quick controls from your menu bar (macOS)
- **Per-project sounds**: Different sounds for different projects
- **System DND respect**: Optional integration with macOS Focus mode
- **Webhooks**: Send notifications to Slack or Discord
- **Usage stats**: Track your Claude usage patterns (opt-in)

Setup also adds instructions to your `~/.claude/CLAUDE.md` so Claude knows how to control notifications when you ask (e.g., "mute the dings").

## Commands

### `claudeding setup`

Installs hooks into Claude Code, creates config, and adds Claude instructions.

```bash
claudeding setup

# With custom sounds
claudeding setup --complete-sound ~/sounds/done.wav --feedback-sound ~/sounds/attention.wav
```

### `claudeding uninstall`

Removes claudeding hooks and instructions from Claude Code.

```bash
claudeding uninstall
```

### `claudeding status`

Quick overview of current state.

```bash
claudeding status
```

Example output:

```
  claudeding status

  State: 🔔 Active
  Volume: 100%

  Hooks:
    Complete (Stop):        ✓
    Feedback (Notification): ✓
    Error (ToolFailure):     ✓
    Thinking (UserPrompt):   ✗

  Features:
    Skip when focused: on
    AFK override:      30s
    Quiet hours:       off
    Webhooks:          2 configured
```

### `claudeding settings`

Interactive settings menu with all configuration options.

```bash
claudeding settings
```

Features:
- Volume control with test
- Sound picker
- Preview all sounds
- Toggle focus detection, AFK, quiet hours, DND
- Configure webhooks (Slack/Discord)
- Set custom notification messages
- Enable/disable easter eggs

### `claudeding mute`

Toggle sound mute (notifications still show).

```bash
claudeding mute          # Toggle mute on/off
claudeding mute --on     # Mute sounds
claudeding mute --off    # Unmute sounds
```

### `claudeding sounds`

Interactive TUI to preview and select from bundled sounds.

```bash
claudeding sounds
```

### `claudeding config`

Shows current configuration and hook status.

```bash
claudeding config
```

### `claudeding play <event>`

Plays a sound manually. Useful for testing.

```bash
claudeding play complete
claudeding play feedback
claudeding play error

# Bypass focus detection (plays even when terminal is focused)
claudeding play complete --force
```

### `claudeding doctor`

Run diagnostics to verify setup.

```bash
claudeding doctor
```

### `claudeding enable/disable <event>`

Enable or disable specific event sounds.

```bash
claudeding disable error    # Stop playing error sounds
claudeding enable error     # Re-enable error sounds
```

### `claudeding snooze [duration]`

Temporarily pause all sounds.

```bash
claudeding snooze 30m       # Snooze for 30 minutes
claudeding snooze 2h        # Snooze for 2 hours
claudeding snooze           # Check snooze status
claudeding snooze --off     # Cancel snooze
```

### `claudeding tray`

Start a menu bar widget (macOS only). Shows status and quick controls.

```bash
claudeding tray
```

Features:
- **Live status icon**: 🔔 idle, ✅ complete, 👋 needs input, ❌ error, 💤 snoozing, 🔇 muted
- Mute/unmute toggle
- Quick snooze buttons (15m, 30m, 1h, 2h)
- Test sounds
- Native macOS menu
- Runs in background

### `claudeding stats`

View usage statistics (off by default to save resources).

```bash
claudeding stats --on     # Enable logging
claudeding stats          # View stats
claudeding stats --off    # Disable logging
```

Example output:

```
claudeding Stats

Events:
  Today:     12 complete, 8 feedback, 2 errors
  This week: 84 complete, 45 feedback, 7 errors
  This month: 312 complete, 201 feedback, 23 errors
  All time: 536 total events

Insights:
  Avg time between feedback: 14m
  Error rate: 4.3%
  Peak coding hour: 2PM

Top Projects:
  1. my-app (234 events)
  2. api-server (156 events)
  3. docs (89 events)

History file: 42.1 KB (536 events)
```

## Configuration

Config is stored at `~/.claudeding.json`:

```json
{
  "sounds": {
    "complete": null,
    "feedback": null,
    "error": null
  },
  "notify": true,
  "mute": false,
  "volume": 100,
  "skipWhenFocused": true,
  "afkTimeout": 30,
  "respectDnd": false,
  "useProjectConfig": false,
  "logStats": false,
  "quietHours": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  },
  "webhooks": [],
  "customMessages": {
    "complete": ["Done!", "All set!"],
    "feedback": ["Your turn!"],
    "error": ["Oops!"]
  }
}
```

| Option | Description |
|--------|-------------|
| `sounds.complete` | Name of bundled sound or path to custom WAV/MP3. `null` = default |
| `sounds.feedback` | Name of bundled sound or path to custom WAV/MP3. `null` = default |
| `sounds.error` | Name of bundled sound or path to custom WAV/MP3. `null` = default |
| `notify` | Show system notifications (`true`/`false`) |
| `mute` | Mute all sounds (`true`/`false`) |
| `volume` | Volume level 0-100 (default: 100) |
| `skipWhenFocused` | Skip sounds when terminal is focused (`true`/`false`) |
| `afkTimeout` | Seconds of idle time before playing sound even when focused. Set to `0` to disable AFK detection |
| `respectDnd` | Skip sounds when system DND/Focus mode is on (`true`/`false`, default: `false`) |
| `useProjectConfig` | Use `.claudeding.json` in project root if present (`true`/`false`, default: `false`) |
| `logStats` | Log events to history file for stats (`true`/`false`, default: `false`) |
| `quietHours.enabled` | Enable quiet hours (`true`/`false`) |
| `quietHours.start` | Start time in 24-hour format (e.g., `"22:00"`) |
| `quietHours.end` | End time in 24-hour format (e.g., `"08:00"`) |
| `webhooks` | Array of webhook URLs (Slack/Discord auto-detected) |
| `customMessages.complete` | Array of custom completion messages |
| `customMessages.feedback` | Array of custom feedback messages |
| `customMessages.error` | Array of custom error messages |

### Per-Project Config

With `useProjectConfig: true`, you can create a `.claudeding.json` in any project root to override global settings:

```json
{
  "sounds": {
    "complete": "chord"
  },
  "volume": 50
}
```

## Webhooks

Send notifications to Slack or Discord when Claude completes tasks or needs input.

### Setup via Settings

```bash
claudeding settings
# → Webhooks → Add webhook → paste URL
```

### Setup via Config

Add webhook URLs to `~/.claudeding.json`:

```json
{
  "webhooks": [
    "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    "https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK"
  ]
}
```

Webhook type (Slack/Discord) is auto-detected from the URL. Messages are formatted appropriately for each platform with emoji indicators and project names.

## Playful Fun

Optional silly features (off by default):

### Jeopardy Thinking Music

Play Jeopardy theme when Claude starts thinking:

```bash
claudeding enable thinking
```

Disable with `claudeding disable thinking`.

### Fart Easter Egg

1% chance of a random fart sound on any notification:

```bash
claudeding enable farts
```

Disable with `claudeding disable farts`.

## Platform Support

| Platform | Audio | Notifications |
|----------|-------|---------------|
| macOS    | `afplay` | terminal-notifier / osascript |
| Linux    | `paplay` / `aplay` | notify-send |
| Windows  | PowerShell | Toast notifications |

### macOS: Better Notifications

For better notification branding, install terminal-notifier:

```bash
brew install terminal-notifier
```

Without it, notifications show as "Script Editor". With it, they show your terminal's icon (VS Code, iTerm, etc.).

## How it works

claudeding adds hooks to your Claude Code settings (`~/.claude/settings.json`):

- **Notification** hook → plays feedback sound when Claude needs input
- **Stop** hook → plays completion sound when Claude finishes
- **PostToolUseFailure** hook → plays error sound when a tool fails

Your existing hooks are preserved. A backup is created at `~/.claude/settings.json.claudeding-backup` before any modifications.

## Troubleshooting

### Install the hooks manually

If `claudeding setup` didn't run, didn't finish, or you want to install into a specific scope, edit the settings file directly. Claude Code reads hooks from:

| File | Scope |
|------|-------|
| `~/.claude/settings.json` | All projects (user) |
| `.claude/settings.json` | Single project (shareable — commit to repo) |
| `.claude/settings.local.json` | Single project (gitignored) |

Add (or merge into) the top-level `"hooks"` key:

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "claudeding play feedback" }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "claudeding play complete" }
        ]
      }
    ],
    "PostToolUseFailure": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "claudeding play error" }
        ]
      }
    ]
  }
}
```

Notes, straight from the [Claude Code hooks docs](https://docs.claude.com/en/docs/claude-code/hooks):

- `Stop` fires whenever Claude finishes responding. It ignores matchers — you can omit `matcher` entirely.
- `Notification` matchers are optional. `""` (or omitting) fires on every notification; set to e.g. `"permission_prompt"` or `"idle_prompt"` to filter.
- `PostToolUseFailure` fires after a tool call fails. Set `matcher` to a tool name (e.g. `"Bash"`) if you want to scope it.

Opt-in extras that `claudeding setup` does **not** enable by default:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "claudeding play thinking" }] }
    ],
    "PreToolUse": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "claudeding stop-thinking" }] }
    ]
  }
}
```

Enable them with `claudeding enable thinking`.

### Hooks installed but nothing happens

Run `claudeding doctor` first — it reports what's missing. Then check the usual suspects:

- **`claudeding` not on Claude Code's `PATH`.** The hook fires, but the command can't be resolved. Test with `which claudeding` from a fresh terminal; if it's missing, reinstall globally (`npm install -g @byricky/claudeding`) or replace `"command": "claudeding …"` with the absolute path.
- **`~/.claude/settings.json` has invalid JSON.** One stray comma and Claude Code skips the file. Validate with `node -e 'JSON.parse(require("fs").readFileSync(process.env.HOME + "/.claude/settings.json","utf8"))'`.
- **Hook entries were added mid-session.** Start a new Claude Code session after editing `settings.json`.
- **You're muted / snoozed.** `claudeding status` shows both. Fix with `claudeding mute --off` / `claudeding snooze --off`.
- **Terminal focused + not AFK.** By design. Disable with `skipWhenFocused: false`, or lower/disable `afkTimeout` in `~/.claudeding.json`.
- **Quiet hours / system DND.** Check `quietHours` and `respectDnd` in config.
- **Volume is 0.** `claudeding settings` → Volume.

### Sounds play in terminal but not from Claude Code

Same PATH issue as above, 95% of the time. Claude Code's hook shell may not load your interactive shell init (e.g. `nvm`-managed `node` not being visible). Fix by using the absolute path to `claudeding` in the hook `command`.

### Menu bar tray is sluggish or shows "Not Responding"

Update to the latest version — the tray now runs its focus/idle checks asynchronously with a 10s cache and skips menu rebuilds when nothing has changed. Older versions blocked the Electron main thread every 2 seconds.

If you suspect multiple trays are running:

```bash
pgrep -fl "Electron.*src/tray/main\.js"
pkill  -f  "Electron.*src/tray/main\.js"
claudeding tray
```

The current build holds a single-instance lock, so duplicate launches exit immediately.

### Start over cleanly

```bash
claudeding uninstall   # removes only claudeding's hooks
claudeding setup       # reinstalls them
```

`claudeding uninstall` leaves `~/.claude/settings.json.claudeding-backup` in place — restore it with `cp ~/.claude/settings.json.claudeding-backup ~/.claude/settings.json` if anything got mangled.

## License

MIT
