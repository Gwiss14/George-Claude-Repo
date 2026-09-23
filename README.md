# George-Claude-Repo

For Claude Code on my phone.

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
