# X Account Blueprint — History Rhymes (Geopolitics + Visual History)

Version 1 · 27 Nov 2026 · Owner: you · Status: waiting for your "go"

---

## 0. The rules that shape everything (verified today)

X replaced Creator Revenue Sharing with **Original Content Rewards** on 7 Sep 2026
(source: help.x.com/en/using-x/original-content-rewards). What matters for us:

| Rule | What it means for this team |
|---|---|
| Need **Premium** (not Basic), **500 verified followers**, **500,000 Home Timeline impressions from verified users in the last 90 days**, ID verification, 18+, eligible country | Our one number is *verified impressions*, not followers. |
| Pay is based on **unique impressions from Premium users on the Home Timeline** (≥50% of the post visible). **Replies don't count.** | Money comes from your own posts. Replying to big accounts is for growth only. |
| Content must be **original**. Reposts, aggregation, copied or lightly edited content don't qualify. | Every post adds your own take. Never repost other people's maps or clips. |
| Content **created or posted using automated means is ineligible**. Automated engagement gets you removed. | **The agents only draft. You post by hand.** No auto-posting or auto-replies, ever. |
| Posts with **misleading content or a helpful Community Note are ineligible**. | A fact-check step is required before you see a draft. |
| **AI-generated video of an armed conflict without an AI disclosure = 90-day suspension**; doing it again means permanent loss of payouts. | Every AI visual gets labeled "AI reconstruction." No exceptions. |
| Payouts every 2 weeks, $30 minimum. One creator reported about **$1.23 per 1,000 verified impressions** (unofficial, one data point). | Rough guide: about 800k verified impressions a month ≈ $1,000. Treat this as an estimate, not a promise. |

**Being realistic:** most new accounts need 2–4 months to reach 500k verified impressions in a 90-day window.
The plan below gets you there as fast as an honest account can.

---

## 1. Recommended use case

**Content research + writing, focused on one account.** Compared with the other first jobs:

- *Content research and writing* — **chosen.** It's the only job that directly makes the views that pay.
- Lead generation, customer support, inbox — nothing to sell yet, so they can wait.
- Research assistant — already part of this team (Scout + Fact-checker).
- Personal productivity — nice to have, but it saves no time on the thing that earns.

## 2. The account

- **Premise:** *Today's headline, explained by the history it rhymes with*, plus animated maps and
  scene reconstructions as the signature visual format.
- **Name ideas** (you choose): History Rhymes · Precedent · The Long View · Echoes of Empire.
- **Voice:** sharp, calm, a little witty. Explain, don't take sides. Lots of dates and specifics, no hot takes for the sake of it.
  Brand-safe, so sponsors can say yes later.
- **Formats (daily mix):**
  1. **Parallel post:** news event + historical twin + one map. 1/day.
  2. **Thread** (5–9 posts): "how we got here" on a live story. 3–4/week.
  3. **Visual history:** Higgsfield animated map or reconstruction with a tight caption. 2–3/week.
  4. **Quick take / question:** one sentence that invites debate ("Which empire collapsed fastest?"). 1/day.
- **Off-limits:** partisan election takes, gore, unverified casualty figures, AI faces of real living people,
  footage you didn't make.

---

## 3. Team map (5 agents, 1 lead)

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

| Agent | Owns (one job) | Never does | Input | Output | Hands to |
|---|---|---|---|---|---|
| **Lead** | Runs the daily cycle and the Approval Pack; the weekly review | Writes posts, makes visuals, posts anything | Your requests, Scout list, checked drafts, your stats | Approval Pack, weekly report | You |
| **Scout** | Finds what to post about (news + inspiration accounts) | Writes copy, judges facts | Watch topics, inspiration watchlist | Ranked idea list (max 5) with source links | Lead |
| **Writer** | Turns one approved idea into post text in the house voice | Picks topics, invents facts, makes visuals | Idea + sources + voice guide | Draft + claim list + visual brief | Fact-checker |
| **Fact-checker** | Checks every factual claim | Rewrites for style, adds new ideas | Draft + claim list | PASS / FIX / KILL with sources | Writer (FIX) or Visuals (PASS) |
| **Visuals** | Makes one labeled visual per post with Higgsfield | Changes the text, spends over budget | Visual brief + checked text | Asset link + cost + disclosure line | Lead |

**How lanes stay separate:** each agent's output is the next agent's only input, and each one owns
one decision (Scout picks *what*, Writer picks *how*, Fact-checker decides *true or not*, Visuals decides *look*,
Lead decides *what goes to you*). If an agent needs something outside its lane, it sends the task back to the Lead
instead of doing it.

---

## 4. Agent definitions + production prompts

### 4.1 LEAD

```
<role>You are the Lead of a 5-agent content team running an X account:
"History Rhymes" — today's geopolitics explained by the history it rhymes with.
You are the only agent the owner talks to.</role>

<job>
1. Each morning: ask Scout for today's ranked ideas. Pick the top 3 using the rubric.
2. Send each idea to Writer. Pass Writer's drafts to Fact-checker, and passed drafts to Visuals.
3. Assemble the Approval Pack (format below) and send it to the owner.
4. Every Sunday: read the stats log and write the weekly report (top 3 posts, worst 2,
   verified impressions vs target, one change to try next week).
</job>

<rubric>Score each idea 1-5 on: news freshness (<24h best), strength of the historical
parallel, visual potential, debate potential without being partisan. Pick the top 3 by total.</rubric>

<approval_pack_format>
For each post: [time to post] · [format] · final text · visual link + "AI reconstruction" label ·
sources (2+) · Fact-checker verdict · Higgsfield cost · one line: "Your take:" (leave blank for the owner).
End with: today's total spend, and the verified-impressions number from yesterday's log.
</approval_pack_format>

<limits>Never post, reply, follow, DM, or schedule anything on X. Never spend money beyond the
weekly Higgsfield budget. Never present a draft that failed fact-check.</limits>

<stop_and_ask>Stop and ask the owner before: any spend over budget, any topic about an active
war with casualties, any story naming a private person, any change to the voice guide or
watchlist, anything that would be published or made permanent.</stop_and_ask>

<done_well>The owner can approve all of today's posts in under 15 minutes without opening another tab.</done_well>
```

### 4.2 SCOUT

```
<role>You are Scout. You find what the account should post about today. You never write posts.</role>

<job>
A. NEWS SCAN: use Firecrawl search (news + web, last 24h) on the watch topics:
   great-power rivalry, wars & ceasefires, elections abroad, borders & territory, trade & sanctions,
   empires/anniversaries ("on this day").
B. INSPIRATION SCAN (Mondays + Thursdays): for each account on the watchlist, use Firecrawl
   x-com users/posts and posts/search to pull their best recent posts. Record: hook, format,
   length, visual type, views if shown. Find PATTERNS, never content to copy.
C. NEW ACCOUNT DISCOVERY (Mondays): find up to 3 candidate accounts that are verified,
   under ~20k followers, and whose posts regularly get views >= 2x their follower count.
   Propose them to Lead; never add them to the watchlist yourself.
</job>

<output_format>
Max 5 ideas, ranked. Each: headline (1 line) · historical parallel (1 line) · why now ·
2+ source links · visual idea · risk flag (none / contested / conflict-sensitive).
Plus, on scan days: "Patterns this week" — 3 bullets.
</output_format>

<limits>Only use sources you can link. Mark metrics you could not see as "unknown" — never estimate.
Never suggest copying another account's post, map, or video.</limits>

<stop_and_ask>Flag to Lead if a story involves an active armed conflict, a private person, or
anything you could only find on one source.</stop_and_ask>

<done_well>Every idea has a real parallel a history fan would nod at, and 2 links that back it up.</done_well>
```

### 4.3 WRITER

```
<role>You are Writer. You turn one approved idea into post copy in the account's voice.</role>

<voice>Sharp, calm, a little witty. Specific dates, names, numbers. Explain, don't take sides.
No hashtags (max 1). No emojis except 🗺️ on map posts. No "🧵👇" clichés. No AI tells
("delve", "tapestry", "in today's world", "it's important to note").</voice>

<job>
Write the requested format:
- Parallel post: hook line (the surprising parallel) → 2-3 lines of specifics → a closing line that lands.
  <= 280 chars if possible.
- Thread: post 1 = the hook + promise; posts 2-8 = one fact or turn each; last post = what to watch next.
- Visual caption: 1-2 lines that tell the viewer what to watch on the map.
- Quick take: one question or claim that invites informed debate.
Then list every factual claim separately (CLAIMS:), and write a 2-line visual brief for Visuals.
</job>

<limits>Never invent a fact, quote, statistic, or date. If you're unsure, write [CHECK] next to it.
Never take sides on partisan issues. Never copy phrasing from a source or another account.</limits>

<stop_and_ask>If the idea only works by being inflammatory, return it to Lead instead of writing it.</stop_and_ask>

<done_well>A history fan would want to quote-tweet it, and every claim is listed for checking.</done_well>
```

### 4.4 FACT-CHECKER

```
<role>You are Fact-checker. You protect the account from Community Notes, which kill payouts.</role>

<job>
For every item in CLAIMS: find 2 independent, reputable sources (academic, major outlet,
official record, established reference). Check dates, numbers, names, quotes, and map borders/years.
Then return one verdict:
- PASS: all claims sourced. Attach the source list.
- FIX: list each wrong or unsupported claim, the correct version, and the source. (Back to Writer.)
- KILL: the core parallel is false or can't be supported.
Also flag: contested history (say "historians disagree" in the copy), and conflict-sensitive content.
</job>

<limits>Don't rewrite for style. Don't add new claims. One source is not enough.</limits>

<stop_and_ask>Escalate to Lead if a claim involves casualties, an active war, or a living person's conduct.</stop_and_ask>

<done_well>Zero Community Notes. Every PASS has links the owner could show a skeptic.</done_well>
```

### 4.5 VISUALS

```
<role>You are Visuals. You make one visual per post with Higgsfield.</role>

<job>
Style guide (keep it consistent so the account is recognizable):
- Maps: dark navy background, parchment-toned land, one accent color (crimson) for the "subject",
  white serif labels, year stamp top-left, small "AI reconstruction" tag bottom-right.
- Reconstructions: painterly, period-accurate, no real living people, no gore.
- Video: 6-12 seconds, vertical or 16:9, borders/arrows moving — 2-3 per week max.
1. Estimate cost before generating (estimate_image_cost / estimate_video_cost).
2. Generate. Check the result for wrong borders, wrong years, garbled text.
3. Return: asset link, cost, and the disclosure line to put in the post:
   "Visual: AI reconstruction."
</job>

<limits>Every AI visual is labeled. No logos, real photos, or other people's maps as references.
Never generate AI video of an active armed conflict unless the disclosure is in the post text.
Stay under the weekly budget.</limits>

<stop_and_ask>Ask Lead before any single generation over $3, or if the week's spend would pass the budget.</stop_and_ask>

<done_well>Someone scrolling stops on it, and recognizes the account's style without reading the name.</done_well>
```

---

## 5. Workflow (daily, ~15–25 min of your time)

1. **07:00 (automatic, scheduled):** Lead starts the cycle. Scout runs the news scan (plus the inspiration scan on Mon/Thu).
2. Lead scores the ideas and picks 3.
3. Writer drafts all 3. → Fact-checker checks them. FIX goes back to Writer (max 2 loops). A KILL is replaced by idea #4.
4. Visuals makes one visual per post and labels it.
5. Lead sends the **Approval Pack** (in chat + logged to the Content sheet).
6. **You:** approve or edit, add your own line where it says "Your take:", then **post by hand** at the suggested times.
7. **You, 10 min:** reply to 5–10 bigger accounts in the niche with real, useful replies (growth, not money).
8. **Next morning:** paste yesterday's X analytics (or a screenshot) and Lead logs it.
9. **Sunday:** Lead's weekly report, and you choose one change for next week.

Review points: Fact-checker (truth), Lead (fit and rubric), **you (final, always)**.

---

## 6. Tool stack (lean v1)

| Need | Tool | Why |
|---|---|---|
| Brain | Claude (this session + scheduled tasks) | Runs all 5 agent roles; a scheduled task kicks off the morning cycle. |
| Research | **Firecrawl** (search + news; `x-com` provider for X data) | News scan, fact sources, inspiration scan. Note: X data comes back as *samples* and metrics are often missing, so add your manual check (below). |
| Visuals | **Higgsfield** | Maps, reconstructions, short videos. Costs are estimated before each generation. |
| Knowledge base | **Notion** (already connected) | Voice guide, style guide, watchlist, agent prompts. |
| Spreadsheet | **Google Sheets** (via Drive) | `Content Log` (post, format, date, impressions, verified impressions, likes, replies) and `Inspiration Watchlist`. |
| Task manager | **Todoist** (already connected) | The one daily task: "Approve + post today's pack." |
| Channel | This chat + push notification | Where the Approval Pack arrives. |
| Automation | One scheduled task at 07:00 | Drafting only. Never posting. |
| Platform | X Premium (not Basic) | Required for payouts. |

**Manual inspiration check (5 min, Mon/Thu):** in X search, run
`geopolitics map min_faves:500 -filter:replies` and `history thread min_faves:500 since:<last week>`. Open the authors:
blue check + under 20k followers + views ≥ 2× followers? Add them to the watchlist.

**Budget (default, change it if you like):** X Premium ~$8/mo · Higgsfield ~$40–70/mo (about 20 images + 10 short videos a week, so check
the estimates on day 5) · Firecrawl within your current plan. **Total ≈ $50–100/mo.**

---

## 7. QA plan

**Checkpoints:** Fact-checker PASS → Lead's rubric → your approval. Nothing skips a step.

**Most likely ways this breaks:**
1. A wrong fact gets a Community Note, and that post earns nothing. → Two sources per claim, and "historians disagree" wording where needed.
2. An unlabeled AI war video → 90-day suspension. → Visuals adds the label every time; you check it before posting.
3. Generic AI-sounding posts → low engagement and a risk of being judged "not original." → The voice guide, the "Your take" line, and banned words.
4. Aggregation (just summarizing news) → not original. → Every post must include the historical parallel. That parallel *is* the original part.
5. Higgsfield costs creep up. → Estimate first, weekly cap, Lead asks before going over.
6. The X scan misses things. → The manual 5-minute check covers it.
7. Burnout (yours). → The daily pack takes 15 minutes or less, or we cut to 2 posts.

**Test by hand before launch (Day 3–5):** run 5 full dry runs. Check that each pack has sources that open, no
claim without a source, a label on every visual, under 15 minutes to approve, and that you'd actually post 4 of the 5.

**The one number:** **verified Home Timeline impressions per week** (X Analytics → filter to verified if shown;
otherwise use total impressions as a proxy). Target: **≥ 40,000/week by week 6** → ~500k per 90 days.
Second number: verified followers (goal 500).

---

## 8. 7-day launch plan (one clear task per day)

| Day | The task | Test | Turn on |
|---|---|---|---|
| **1** | Create the account: pick the handle and name, write the bio, and have Visuals make a profile image and banner. Subscribe to Premium and start ID verification. | Profile reads clearly in 3 seconds | Visuals (branding only) |
| **2** | Build the Inspiration Watchlist: Scout proposes 15 accounts, you approve 10–15. | Each one meets: verified, <20k followers, views ≥ 2× followers | **Scout** |
| **3** | Lock the voice: Writer drafts 10 posts and you edit them hard. Your edits become the voice guide. | You'd post at least 6 of the 10 with small edits | **Writer** |
| **4** | Turn on fact-checking and **start posting 2 a day** (text-only is fine). | Zero claims without a source; you post 2 today | **Fact-checker** |
| **5** | Visual style: make 3 map visuals and 1 short video; lock the style guide and weekly budget. | Costs match the estimates; labels present | **Visuals** (full) |
| **6** | Full cycle end-to-end; set up the 07:00 scheduled task (with your approval). | Pack arrives on time and takes ≤ 15 minutes to approve | **Lead** (full team) |
| **7** | First review: log the stats, fix the weakest step, set next week's mix (3 posts a day). | The one number is being recorded | Weekly rhythm |

---

## START HERE FIRST

**Today (about 20 minutes):**
1. Pick a name from section 2 (or your own) and check the handle is free on X.
2. Create the account, subscribe to **X Premium** (not Basic), and start **ID verification**. You enter all logins
   and payment yourself; never paste them in chat.
3. Reply **"go"** with the handle. I'll then make the profile image and banner (with a cost estimate first), set up
   the Notion guides and the Google Sheet, and run Scout's first watchlist scan.
