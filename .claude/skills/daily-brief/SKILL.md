---
name: daily-brief
description: Build George's Daily Ops Brief — surfaces what is actually waiting on him across Gmail, Calendar and Todoist, ranked by stakes and age. Use when asked for the daily brief, "what's on today", "what am I forgetting", reply debt, or action debt.
---

# Daily Ops Brief

Answers one question: **what is waiting on me, and what will quietly slip if I do nothing today?**

The hard part is not fetching data. It is separating the ~5 things that matter from the
~200 newsletters that look identical to a query. Gmail's operators cannot do this alone
(see `filters.md`), so every run has a coarse fetch stage and a judgment stage.

## Stage 1 — Fetch

Run these in parallel. Timezone is **America/Toronto**; "today" always means Toronto local.

**Mail (the candidate pool).** Three separate searches, not one — each catches a different
kind of debt:

1. `in:inbox newer_than:45d -category:promotions -category:social -category:forums`
2. `in:sent newer_than:90d` — who he actually talks to. Anyone here is a real correspondent;
   weight their threads up. This is how sender importance gets learned instead of guessed.
3. `in:inbox older_than:30d newer_than:180d is:important` — the aging tail, where the
   genuinely-forgotten things live.

Fetch thread previews only. Call `get_thread` **only** for candidates that survive Stage 2,
and use `messageFormat: PLAIN_TEXT`.

**Calendar.** `list_events` over today 00:00 → tomorrow 23:59 Toronto.

**Tasks.** `find-tasks-by-date` with `startDate: today`, `overdueOption: include-overdue`.

## Stage 2 — Judge

Sort every mail candidate into exactly one bucket. Do this by reading the sender and snippet,
not by pattern-matching the subject — promotional mail deliberately imitates urgency
("Your Account Status: ACTION NEEDED ⚠️" is a discount ad).

| Bucket | Test | Goes in brief |
|---|---|---|
| **Needs reply** | A human asked him something and the last message is not his | Yes, top |
| **Needs action** | Sign / submit / pay / book / upload, with a real consequence | Yes, top |
| **Waiting on them** | He asked, they owe him. Track the age | Yes, if aging |
| **FYI** | Real but no action — receipts, confirmations, results | Collapsed count |
| **Noise** | Newsletters, marketing, OTPs, login alerts, surveys | Dropped silently |

Apply `filters.md` for the known-noise senders. When genuinely torn, prefer **Needs action** —
a false positive costs him three seconds, a false negative costs him a deadline.

## Stage 3 — Rank

Score each surviving item:

```
score = stakes × age_factor
```

- **stakes**: 5 = money, legal, or a deadline with a consequence · 4 = blocks something he
  started · 3 = a real person waiting · 2 = useful, no deadline · 1 = optional
- **age_factor**: `1 + (days_waiting / 7)`, capped at **2**

Age is the multiplier, not the score, so a 2-day legal deadline still outranks a 40-day nicety.
The cap matters: at 3 a 35-day courtesy reply scored 9.0 against a 2-day conditional-offer
deadline at 6.4. At 2 the deadline wins, which is the behaviour you want.
Show the top 5. More than 5 is a list he will not read.

## Stage 4 — Render

Fill `brief/template.html`, then publish it as an artifact so it opens on his phone.

Four sections, in this order:

1. **Waiting on you** — the ranked items. Each gets: who, the actual ask in plain words, how
   many days it has been sitting, and a direct Gmail `viewUrl` link.
2. **Today** — calendar events, then real tasks. If the calendar is empty, say so plainly;
   do not pad it.
3. **Slipping** — anything past 14 days with no movement, including threads where *he* is owed
   a reply. This is the section that earns the brief its keep.
4. **Noise filtered** — one line: "N newsletters and notifications hidden." Proves the filter
   ran without showing its work.

## Rules

- **Never send, reply, archive or label anything.** This skill reads. Acting is George's call.
- If a section is empty, say it in one line. Never invent an item to fill space.
- Recurring Todoist habits ("Drink 8 glasses of water") are a habit tracker, not obligations —
  collapse them to a count. Only surface a recurring task if it has been overdue 30+ days,
  which means the system itself has drifted.
- Lead with the single most important thing. If he reads one line, it should be the right one.
