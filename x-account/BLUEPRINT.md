# X Account Blueprint — F1 With the Backstory

Version 2 · 27 Nov 2026 · Owner: you · Status: **live, starting with the Qatar GP weekend**
(v1 was a geopolitics account. You switched to F1 on 27 Nov.)

---

## 0. The rules that shape everything (verified 27 Nov 2026)

X replaced Creator Revenue Sharing with **Original Content Rewards** on 7 Sep 2026
(source: help.x.com/en/using-x/original-content-rewards).

| Rule | What it means for us |
|---|---|
| You need **Premium** (not Basic), **500 verified followers**, **500,000 Home Timeline impressions from verified users in the last 90 days**, ID verification, and to be 18+ in an eligible country | Our one number is *verified impressions*. |
| Pay is based on **unique impressions from Premium users on the Home Timeline**. **Replies don't count.** | Money comes from your own posts. Replies are only for growth. |
| Content must be **original**. Copied, downloaded-and-reuploaded or lightly edited content (a caption, filter or text overlay) doesn't count. | **Never upload F1 footage yourself.** Quote-post the official clips and add your take. |
| Content **posted using automated means is ineligible**. | The agents only draft. **You post by hand.** |
| A post with a helpful **Community Note**, or a misleading one, is ineligible. | A fact-check step is required. Wrong results and wrong stats cost money. |
| AI video of armed conflict without a disclosure means a 90-day payout suspension. | Not an F1 issue, but **label every AI visual** anyway: "Graphic: AI-assisted." |
| Payouts every 2 weeks, $30 minimum. One creator reported about $1.23 per 1,000 verified impressions (unofficial). | Roughly: 800k verified impressions a month ≈ $1,000. That's an estimate, not a promise. |

**Copyright risk:** F1 uses an agency that files DMCA takedowns on X in bulk (fans reported new ones in Nov 2026).
Repeated strikes can get the account suspended. Footage that's never uploaded can't get a strike.

---

## 1. The account

- **Premise:** *F1 with the backstory.* Live race-weekend reporting like a journalist, plus iconic races and
  moments from every era, always linking today's racing to its history.
- **Voice:** a sharp, informed paddock journalist with a historian's memory. Specific laps, gaps, dates and names.
  Confident takes, never trash talk. Fair to every driver and team.
- **Off-limits:** uploading footage, team logos or crests, realistic AI images of real drivers, fake rumors or "sources say"
  without a real source, politics around host countries, and anything conflict-related.

### Two modes

**RACE-WEEKEND MODE (Thursday–Sunday): be the journalist**

| Moment | Posts |
|---|---|
| Thu (media day) | Preview: the 3 storylines, track facts, and the "history at this track" graphic |
| After each practice session | Results + your read (who's sandbagging, long-run pace), quote-posting @F1's session clip |
| Before qualifying / race | Backstory thread on the track's most famous moments |
| After qualifying | Pole quote-post + top-10 grid graphic + "pole here historically means…" stat |
| After the race | Winner quote-post + podium/standings graphic + "what it means next" + one history stat |
| Live | 2–4 quick takes during the race on big moments (text only, fast) |

Target: **4–6 posts a day** on weekends.

**OFF-SEASON / BETWEEN RACES: be the historian**

| Day | Series |
|---|---|
| Mon | **Iconic Race** thread: one classic race told lap by lap (e.g. Monaco '88, Brazil '08, Abu Dhabi '21) |
| Tue | **On This Day** card |
| Wed | **Era vs Era** debate ("Greatest qualifying lap ever?", "Best car of the 90s?") |
| Thu | **Rivalry File** (Senna/Prost, Hamilton/Rosberg, Verstappen/Russell…) |
| Fri | **Fact or Fiction** / stat card |
| Sat | **Backstory** of a current driver or team (how they got here) |
| Sun | Weekly roundup of F1 news, with the history that matters |

Target: **2–3 posts a day.** Between Dec 6 and the March season opener, this mode carries the account.

### The quote-post playbook (how we use footage)
1. Find the official clip (@F1, team accounts, official broadcasters).
2. **Quote it.** The clip plays inside your post, and you aren't re-uploading anything.
3. Your text is the original part: the context, the stat, the "this happened before in 1989…" angle.
4. For classic races with no official clip: tell the story in text, add our own graphics (track maps, gap charts, stat cards),
   and link the official archive video if one exists.

---

## 2. Team map (5 agents, 1 lead)

```
                YOU  (approve, add your line, post by hand, reply)
                 ▲ ▼
            ┌──────────┐
            │   LEAD   │  the only agent you talk to
            └──────────┘
          ▼     ▲     ▼      ▲
   ┌──────────┐ │ ┌──────────┐ │
   │  SCOUT   │─┘ │  WRITER  │─┤
   └──────────┘   └──────────┘ │
                       ▼       │
                 ┌──────────────┐
                 │ FACT-CHECKER │──(fail → back to Writer, max 2 loops)
                 └──────────────┘
                       ▼
                 ┌──────────────┐
                 │   VISUALS    │──▶ Lead builds the Approval Pack
                 └──────────────┘
```

| Agent | Owns | Never does | Input | Output | Hands to |
|---|---|---|---|---|---|
| **Lead** | Session-timed cycle, Approval Pack, weekly review | Writes, designs, posts | Your requests, Scout list, checked drafts, your stats | Approval Pack, weekly report | You |
| **Scout** | Results, news, clips to quote, inspiration accounts | Writes copy, judges facts | Session schedule, watch topics, watchlist | Ranked ideas + links to official clips | Lead |
| **Writer** | Post copy in the house voice | Picks topics, invents stats | Idea + sources + voice guide | Draft + claim list + visual brief | Fact-checker |
| **Fact-checker** | Every result, time, gap, stat and date | Rewrites style, adds ideas | Draft + claim list | PASS / FIX / KILL + sources | Writer or Visuals |
| **Visuals** | Labeled graphics in Higgsfield | Changes text, overspends | Brief + checked numbers | Asset + cost + label | Lead |

---

## 3. Agent prompts

### 3.1 LEAD
```
<role>You are the Lead of a 5-agent team running an F1 account on X: "F1 with the backstory",
live race-weekend journalism plus F1 history from every era. You are the only agent the owner talks to.</role>

<job>
RACE WEEKEND: after each session (FP1/FP2/FP3/Sprint/Quali/Race), run the cycle within 15 minutes:
Scout → pick 2-4 ideas → Writer → Fact-checker → Visuals → Approval Pack.
OFF-SEASON: each morning, run the cycle for the day's series (see the weekly series table), 2-3 posts.
SUNDAY: weekly report — top 3 posts, worst 2, verified impressions vs target, one change for next week.
</job>

<rubric>Score ideas 1-5 on: freshness, the strength of the backstory or history angle, availability of an official clip to quote,
debate potential. Pick by total.</rubric>

<approval_pack_format>
Per post: [post time, UTC + owner's local time] · format · final text · clip to quote (link) or visual (file + label) ·
2+ sources · Fact-checker verdict · Higgsfield credits · "Your take:" (blank, for the owner).
End with: today's credit spend, and yesterday's verified impressions.
</approval_pack_format>

<limits>Never post, reply, like, follow or DM on X. Never suggest uploading F1 footage. Stay within the credit budget.
Never send a draft that failed fact-check.</limits>

<stop_and_ask>Ask the owner before: going over budget, any story about a crash with injuries, any rumor
with only one source, legal/disciplinary stories about people, host-country politics, and anything published or permanent.</stop_and_ask>

<done_well>The owner approves a session pack in under 5 minutes, and posts it while the session is still trending.</done_well>
```

### 3.2 SCOUT
```
<role>You are Scout. You find what to post about and the official clips to quote. You never write posts.</role>

<job>
A. SESSION RESULTS: classification, gaps, tyres and penalties from 2 sources (formula1.com + one major outlet).
B. NEWS: Firecrawl news search (last 24h) on drivers, teams, contracts, regulations, penalties.
C. CLIPS: find the official post (@F1, the teams, the broadcasters) for each key moment, and give its URL to quote.
D. HISTORY HOOKS: for every current story, find 1 historical parallel at the same track or a similar situation.
E. INSPIRATION (Mon + Thu): use Firecrawl x-com (users/posts, posts/search) on the watchlist; record hooks, formats, lengths
   and visuals. Propose up to 3 new accounts: verified, under ~20k followers, views ≥ 2x followers. Report patterns, never copy.
</job>

<output_format>Max 5 ideas: headline · history hook · why now · sources · clip URL (or "none") · risk flag.</output_format>

<limits>Only official or reputable sources. Metrics you couldn't see = "unknown". Never treat rumor accounts as a source.</limits>

<done_well>Every idea arrives with a clip to quote or a clear graphic idea, plus a backstory angle.</done_well>
```

### 3.3 WRITER
```
<role>You are Writer. You write posts in the voice of a paddock journalist with a historian's memory.</role>

<voice>Specific (laps, gaps to the thousandth, years, names). Confident, fair, a little dry wit.
Max 1 hashtag. No "🧵👇". No AI tells ("delve", "tapestry", "it's important to note", "in the world of F1").
Use driver surnames after the first mention.</voice>

<formats>
- Session reaction (quote-post): who + time + gap → the real read (what the session does or doesn't tell you) → what to watch next.
- Stat card caption: 3-5 lines of numbers, then 1 line that lands.
- Backstory thread (5-8 posts): hook → one moment per post → it ties back to this weekend → question.
- Iconic Race thread (6-10 posts): set the scene → the key laps → why it mattered → "Where were you?"
- Debate post: one sharp question with 2-4 named options.
</formats>

<job>Write the draft. List every factual claim separately (CLAIMS:). Write a 2-line visual brief, or name the clip to quote.</job>

<limits>Never invent a time, gap, quote or stat. Mark anything unsure with [CHECK]. Never mock drivers or fans.
Never write "breaking" unless it comes from an official source.</limits>

<done_well>An F1 fan learns something in 10 seconds and wants to reply.</done_well>
```

### 3.4 FACT-CHECKER
```
<role>You are Fact-checker. You stop Community Notes, which kill payouts and credibility.</role>

<job>Check every CLAIM against 2 independent sources: official F1/FIA timing and reports, and established outlets
(Motorsport.com, The Race, Autosport, BBC, Sky). Check numbers digit by digit: lap times, gaps, points, years, race
counts, grid positions and penalties. Check graphics against the same numbers.
Verdict: PASS (with sources) / FIX (what's wrong + correct value + source) / KILL.</job>

<limits>No style edits. No new claims. One source isn't enough for anything that looks like a record ("first", "most", "only").</limits>

<done_well>Zero Community Notes. Every PASS comes with links you could show a skeptic.</done_well>
```

### 3.5 VISUALS
```
<role>You are Visuals. You make the graphics with Higgsfield (default model: gpt_image_2_6, quality high, 2k, 16:9).</role>

<style>Dark charcoal or navy background · bold white condensed sans-serif titles · muted team-colored bars
(no logos) · stylised floodlit circuit outlines · small "Graphic: AI-assisted" bottom-right.
Formats: standings bars, grid top-10, winners timeline, track map with sectors, era vs era comparison, On This Day card.</style>

<job>Estimate the cost first (about 2 credits per image). Generate. Check every word and number against the checked text,
and regenerate if anything is wrong. Return the file, the credits used and the label.</job>

<limits>No team logos or crests, no realistic images of real drivers, no copies of broadcast graphics or photos.
Max 2 credits per graphic without asking; weekly cap 60 credits unless the owner raises it.</limits>

<done_well>It's readable on a phone in 2 seconds, and recognizably *our* style.</done_well>
```

---

## 4. Workflow

**Race weekend (session-timed):**
1. A session ends → a scheduled check-in fires about 10 minutes later.
2. Scout: results + news + clip links + history hook. → Lead picks 2–4.
3. Writer drafts → Fact-checker (FIX loops max 2) → Visuals makes graphics.
4. Lead sends the Approval Pack in chat and saves it to `x-account/packs/`.
5. **You:** add your line, quote-post or post with the graphic, by hand. 5 minutes.
6. During the race: you post 2–4 live quick takes yourself (fast beats perfect).

**Off-season (daily, 07:00 your time):** the same cycle for the day's series, 2–3 posts, about 15 minutes.

**Daily, you, 10 minutes:** reply to 5–10 bigger F1 accounts with real insight (growth).
**Next morning:** paste yesterday's X analytics, and Lead logs them.
**Sunday:** weekly report → you choose one change.

---

## 5. Tool stack

| Need | Tool | Why |
|---|---|---|
| Brain | Claude (this session + scheduled check-ins) | Runs all 5 roles; session-timed drafts |
| Research | **Firecrawl** (news/web search, x-com provider) | Results, news, fact sources, inspiration scan |
| Visuals | **Higgsfield** (Plus plan; 1,144 credits as of 27 Nov) | ~2 credits per graphic |
| Knowledge base | This repo (`x-account/`) + Notion (optional) | Blueprint, packs, graphics, voice guide |
| Spreadsheet | Google Sheets | `Content Log` + `Inspiration Watchlist` + `F1 Calendar` |
| Task manager | Todoist | "Post the pack" reminders per session |
| Platform | X Premium (not Basic) | Required for payouts |

**Manual inspiration check (5 min, Mon/Thu):** search X for `F1 min_faves:500 -filter:replies` and
`(Senna OR Schumacher OR "on this day") F1 min_faves:300`. Add authors who are verified, have under 20k followers, and get views ≥ 2× their followers.

**Budget:** X Premium ~$8/mo · Higgsfield already on Plus (budget ~60 credits a week) · Firecrawl within your plan.

---

## 6. QA plan

**Checkpoints:** Fact-checker PASS → Lead rubric → your approval.

**Most likely ways this breaks:**
1. A wrong time, gap or stat gets a Community Note. → 2 sources, digit-by-digit checks, records need extra proof.
2. A footage upload gets a DMCA strike. → Quote-posts only, never upload.
3. Generic "F1 news account" posts get judged not original and are easy to ignore. → Every post needs a take or a history angle.
4. Slow during sessions, so the moment passes. → Session-timed check-ins; you post quick takes yourself.
5. The off-season dip. → The weekly series table keeps 2–3 posts a day going until March.
6. AI graphic typos. → Visuals checks every character; regenerate if wrong.
7. Feud bait turns toxic. → Report rivalries, don't take sides.

**One number:** **verified Home Timeline impressions per week.** Target ≥ 40,000/week by week 6 (about 500k per 90 days).
Second: verified followers (goal 500).

---

## 7. Launch plan

| Day | Date | The task | Turn on |
|---|---|---|---|
| 1 | Fri 27 Nov | **Qatar FP1/FP2** — first packs; you post 3–4 | Scout, Writer, Fact-checker, Visuals |
| 2 | Sat 28 Nov | **Qatar qualifying** — backstory thread + quali pack | Full team |
| 3 | Sun 29 Nov | **Qatar race** — race pack + 2–4 live takes by you | — |
| 4 | Mon 30 Nov | Review the weekend's stats; Scout builds the watchlist (10–15 accounts); fix the slowest step | Inspiration scan |
| 5 | Tue 1 Dec | Lock the voice guide from your edits; set up the Google Sheet | — |
| 6 | Thu 3 Dec | **Abu Dhabi preview** (finale storylines, Yas Marina history incl. 2021) | Race-weekend mode |
| 7 | Sun 6 Dec | **Season finale** → then switch to off-season mode on 7 Dec | Off-season series |

---

## START HERE FIRST

1. **Today:** post the Friday pack (`x-account/packs/2026-11-27-qatar-friday.md`) and add your line to each post.
2. Make sure you have **X Premium** (not Basic) and start **ID verification** under Monetization. Enter the details yourself, never in chat.
3. Tell me your **handle** so Scout can track how your posts perform.
