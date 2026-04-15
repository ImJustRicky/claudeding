# claudeding

This is claudeding - audio notifications for Claude Code.

## Commands Available

When the user asks about notifications or sounds, you can help them with these commands:

| Command | Description |
|---------|-------------|
| `claudeding mute` | Toggle sound mute (notifications still show) |
| `claudeding mute --on` | Mute sounds |
| `claudeding mute --off` | Unmute sounds |
| `claudeding config` | Show current configuration |
| `claudeding sounds` | Interactive sound picker |
| `claudeding play complete` | Test the task complete sound |
| `claudeding play feedback` | Test the waiting for input sound |
| `claudeding setup` | Install/reinstall hooks |
| `claudeding uninstall` | Remove hooks |

## User Requests

- "mute notifications" / "be quiet" / "shush" → `claudeding mute --on`
- "unmute" / "turn sounds back on" → `claudeding mute --off`
- "change notification sound" → `claudeding sounds`
- "test the ding" → `claudeding play complete`
