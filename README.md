# George-Claude-Repo
For Claude Code on my phone

## Mods

| Mod | What it does |
| --- | --- |
| `turn-band` | A line above the prompt showing how long the last turn took and how many tools ran. **Hide** hides it; `/turn-band` shows it again. |
| `agents-live` | A pane that opens when a subagent starts and lists every agent in the session: running, done or failed, with type, model, tool calls and time. `/agents-live` reopens it; `/pane-check` says whether your screen can show panes. |
| `weather-pane` | Current weather and a 5-day forecast in a side pane, plus a one-line summary above the prompt. `/weather Mississauga` picks the city (saved across sessions); `/weather` reopens the pane. Uses Open-Meteo, no API key. |
| `progress-tracker` | A progress bar above the prompt while Claude works through a task list (`███░░░ 3/6 · Now: …`). `/progress` opens the full list in a pane. |

## Install

```
/plugin marketplace add Gwiss14/George-Claude-Repo
/plugin install turn-band@george-claude-repo
/plugin install agents-live@george-claude-repo
/plugin install weather-pane@george-claude-repo
/plugin install progress-tracker@george-claude-repo
```

Start a new session after installing so the mods load.
