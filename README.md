# my-mods

## Code Quest

Turn your Claude Code sessions into a coding RPG: XP, levels, quests and achievements.

**Before installing:** read the source code and make sure you trust it.
Code Quest runs inside Claude Code with the same permissions Claude Code has,
and it is written by its publisher, not Anthropic.

### Install

1. Open Claude Code
2. Run: `/plugin marketplace add VardhanKirti/claude-code-mods`
3. Then: `/plugin install code-quest@my-mods`
4. Run: `/reload-plugins`

If Code Quest doesn't appear, restart Claude Code.

### Use

- A band above the prompt shows your level, XP bar, latest reward and current quest.
- `/quest` shows full status and achievements.
- `/quest set <objective>`, `/quest complete`, `/quest abandon` manage the quest.

XP: read a file +5, modify +10, passing test run +25, git commit +30, quest complete +250.
