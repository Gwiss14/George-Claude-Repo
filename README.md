# George-Claude-Repo
For Claude Code on my phone

## Mods

| Mod | What it does |
| --- | --- |
| `turn-band` | A line above the prompt showing how long the last turn took and how many tools ran. **Hide** hides it; `/turn-band` shows it again. |
| `agents-live` | A pane that opens when a subagent starts and lists every agent in the session: running, done or failed, with type, model, tool calls and time. `/agents-live` reopens it; `/pane-check` says whether your screen can show panes. |
| `weather-pane` | Current weather and a 5-day forecast in a side pane, plus a one-line summary above the prompt. `/weather Mississauga` picks the city (saved across sessions); `/weather` reopens the pane. Uses Open-Meteo, no API key. |
| `progress-tracker` | A progress bar above the prompt while Claude works through a task list (`███░░░ 3/6 · Now: …`). `/progress` opens the full list in a pane. |
| `crab-crew` | Claude and its agents become crabs: the spinner says `Scuttling… 🦀`, turns end with `🦀 Scuttled for 12s`, and subagents get a 🦀 in front of their names. While Claude works, a crab walks along a progress bar above the prompt (`[====🦀·····] 40% · 2/5 tasks`). |
| `work-bar` | A live progress bar above the prompt on every turn. With a task list it fills as tasks finish (`██████░░░░ 50% · 1/2 · Now: … · 1m 05s · 4 tools`); otherwise a block sweeps with a timer and tool count. Ends with `Done in 1m 05s`, then clears. |

## Install

```
/plugin marketplace add Gwiss14/George-Claude-Repo
/plugin install turn-band@george-claude-repo
/plugin install agents-live@george-claude-repo
/plugin install weather-pane@george-claude-repo
/plugin install progress-tracker@george-claude-repo
/plugin install crab-crew@george-claude-repo
/plugin install work-bar@george-claude-repo
```

Start a new session after installing so the mods load.

## Daily Ops Brief

Answers one question each morning: **what is waiting on me, and what will quietly slip
if I do nothing today?**

It reads Gmail, Google Calendar and Todoist through the connectors that are already
authenticated, so there is no OAuth setup and nothing to run locally. Ask for it from
anywhere Claude Code runs, including the phone.

```
/daily-brief
```

or just: *"what's waiting on me?"*

### How it works

| File | Role |
|---|---|
| `.claude/skills/daily-brief/SKILL.md` | The procedure: fetch → judge → rank → render |
| `.claude/skills/daily-brief/filters.md` | Noise senders and real correspondents. Tune this one. |
| `brief/template.html` | The rendered page. Swap the `BRIEF` object, keep the render code. |

The design problem is not fetching data, it is that a 200-thread inbox is ~95% newsletters
that look identical to any query. Gmail's operators cannot separate them on their own —
`-list:*` looked promising and did not hold up under testing — so each run does a coarse
fetch and then a judgment pass. `filters.md` explains the measurement.

Items are scored `stakes × age_factor`, where `age_factor = 1 + days/7` capped at 2. The cap
is load-bearing: at 3, a 35-day courtesy reply outscored a 2-day conditional-offer deadline.

### Rules it follows

- **Read-only.** It never sends, replies, archives or labels. Acting is your call.
- Empty sections say they are empty rather than getting padded.
- Recurring habit tasks collapse to a count — they are a habit tracker, not obligations.

### Scheduling it

Ask Claude to set up a Routine and it will fire on whatever weekday schedule you want,
delivering the brief without you opening anything.

## Hallmark

A design skill for new websites and pages that look designed, not generated. Vendored from
[Gwiss14/hallmark](https://github.com/Gwiss14/hallmark) into `.claude/skills/hallmark`, so it
loads in every session on this repo. It kicks in when you ask to build or design something
new, or by name: `/hallmark redesign <path>`.
