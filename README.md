# claudeding

Audio notifications for Claude Code. Hear a sound when Claude completes a task or needs your input.

> *claudeding is not affiliated with or endorsed by Anthropic.*

## Installation

```bash
# Install globally
npm install -g claudeding
claudeding setup

# Or use npx
npx claudeding setup
```

## What it does

Once set up, you'll hear:
- A **completion sound** when Claude finishes a task
- A **feedback sound** when Claude is waiting for your input

You'll also see a system notification showing which project triggered it.

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
```

## Configuration

Config is stored at `~/.claudeding.json`:

```json
{
  "sounds": {
    "complete": null,
    "feedback": null
  },
  "notify": true,
  "mute": false,
  "skipWhenFocused": true
}
```

- **sounds.complete** / **sounds.feedback**: Name of a bundled sound or absolute path to a custom WAV/MP3 file. `null` uses the default.
- **notify**: Set to `false` to disable system notifications (sound only).
- **mute**: Set to `true` to mute sounds (notifications still show).
- **skipWhenFocused**: When `true` (default), sounds don't play if your terminal is focused. Only dings when you're away!

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

Without it, notifications show as "Script Editor". With it, they show properly branded.

## How it works

claudeding adds hooks to your Claude Code settings (`~/.claude/settings.json`):

- **Notification** hook → plays feedback sound when Claude needs input
- **Stop** hook → plays completion sound when Claude finishes

Your existing hooks are preserved. A backup is created at `~/.claude/settings.json.claudeding-backup` before any modifications.

## License

MIT
