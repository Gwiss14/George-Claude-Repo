# Session notes — F1 X account (saved 27 Nov 2026, ~16:25 UTC)

Read this first when picking the project up in a new session. Full plan: `x-account/BLUEPRINT.md`. Skill: `/f1-post`.

## What this is
A team of AI agents that drafts posts for George's X account **@UtdCapo** (423 followers, previously Man United banter).
New direction: **"F1 with the backstory"** — race-weekend reporting plus F1 history. Goal: earn from X's
Original Content Rewards program.

## Decisions made
- Niche: F1 (geopolitics and Man United were considered and dropped).
- **George posts by hand. The team only drafts.** X's payout rules exclude automated posting, and there is no access to his account.
- **No uploaded F1 footage.** Every race-weekend draft is a quote-post of an official @F1 post, with that post's URL
  on the last line so pasting the draft attaches the media.
- Our own stat graphics carry **no AI label** (George's choice). Images: own graphics → quote-posts → Wikimedia
  Commons with a confirmed license → team media sites only with George's OK.
- Posts stay at 280 characters or fewer (links count as 23) until he has Premium.
- Drafts are delivered in chat, **by Slack DM to himself** (user ID `U0CML2FE33K`, workspace twitterworkflow), and by
  push notification. Gmail was used briefly on 27 Nov and is no longer used.

## State of things
- PR #11 merged to `Master`: blueprint, skill, Qatar Friday pack, graphics, preview page.
- PR #12 merged to `Master`: quote-post rule, pre-FP2 and FP2 drafts, these notes. Branch `claude/epic-hamilton-it7g39` is reused for new work.
- Preview page (private artifact): https://claude.ai/artifact/5f1adRpMfscL1RzPcGiqpf
- Higgsfield: ~1,140 credits left; graphics cost about 2 each.
- George posted the FP1 reaction as a plain text post (the quote did not attach; steps since explained).
- @F1 post IDs already drafted for: `x-account/packs/quoted-ids.txt`.

## Scheduled tasks (all fire into the original session)
- Hourly @F1 check, 12:00–21:00 UTC, 27–29 Nov (`trig_01Emcgc7bWp1cffoULLw5k4P`).
- FP2 pack: 27 Nov 18:10 UTC. Qualifying pack: 28 Nov 19:10 UTC. Race pack: 29 Nov 17:50 UTC.
- Nothing is scheduled yet for the Abu Dhabi GP (4–6 Dec) or the off-season series.

## Open items
1. **X Premium** (not Basic) + ID verification: George will subscribe once he is happy with the drafts. Needed to earn.
2. Rebrand @UtdCapo by hand: display name, bio, optional handle change (suggested text is in the blueprint).
3. Voice feedback on the drafts, to turn into a style guide.
4. Four history claims in the off-season demo drafts still need a second source (Vettel's pass in Brazil 2008,
   Massa's podium reaction, the 1990 Suzuka crash, the "no pairing has matched it" line). Also the 18-lap limit in 2023.
5. Schedule Abu Dhabi weekend tasks, then switch to off-season mode on 7 Dec.
6. Google Sheet for the content log and inspiration watchlist is not set up yet.
7. Firecrawl's X data is sampled; view counts are often missing.
8. George's standing preference "import all mods saved to my PC" could not be met: no computer was attached.
