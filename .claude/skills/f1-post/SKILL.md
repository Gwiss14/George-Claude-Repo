---
name: f1-post
description: Draft George's F1 posts for X (@UtdCapo, "F1 with the backstory"). Use when asked for an F1 post, F1 drafts, a session pack (FP1/FP2/FP3, sprint, qualifying, race), a race-weekend preview, or off-season F1 content (iconic race thread, On This Day, rivalry, debate, stat card). Drafts only, never posts.
---

# F1 Post

Produce a fact-checked **approval pack** of X drafts for George to post by hand.
The full plan, voice and agent prompts are in `x-account/BLUEPRINT.md`. Read it first if it isn't in context.

## Hard rules

- **Never post, reply, like or follow on X.** George posts by hand. X's payout rules exclude automated posting.
- **Never upload F1 footage or agency photos.** Use quote-posts of official accounts instead.
- **Every factual claim needs 2 sources.** Lap times, gaps, points, years and grid positions are checked digit by digit. "First", "most" and "only" claims need extra proof, or get cut.
- **Every race-weekend draft is a quote-post of an official @F1 post**, so the media comes with it. Put the @F1 post's URL on the last line of the draft text: pasting it into X attaches the quote automatically. Get real URLs from Firecrawl `x-com` `users/posts` (username `F1`, today's date). Never invent a URL. Only drafts with our own graphic go without a quote.
- **Whenever @F1 has new posts worth reacting to, draft quote-posts for them.** Record each quoted post ID in `x-account/packs/quoted-ids.txt` and skip IDs already there.
- **After sending drafts, send George a push notification** (PushNotification tool) saying how many drafts are ready.
- **Each post is 280 characters or fewer, counting the link as 23** until George confirms he has X Premium.
- No team logos, no realistic AI images of real drivers, no AI label on stat graphics.
- Stay off host-country politics and anything conflict-related.
- Never ask for passwords or secrets.

## Steps

1. **Pick the mode.** Check the date and the F1 calendar (Firecrawl search).
   - Race weekend (Thu–Sun): which session just ended or is next?
   - Otherwise: the day's off-season series (Mon iconic race, Tue On This Day, Wed era debate, Thu rivalry, Fri stat card, Sat backstory, Sun roundup).
2. **Scout.** With Firecrawl, get the results or news from formula1.com plus one major outlet. Find one history hook for each story. For each quote-post, find the **direct URL of the official post** (@F1, team or broadcaster) and include it.
3. **Write.** 2–4 posts for a session, 2–3 for an off-season day. Voice: a paddock journalist with a historian's memory. Specific numbers, fair to every driver, at most one hashtag, no "🧵👇". Leave a "Your take:" line for George on every post.
4. **Fact-check.** List every claim and confirm it against 2 sources. Fix or cut anything unconfirmed. Say plainly which claims, if any, are not yet sourced.
5. **Visuals (optional, at most one per post).** Higgsfield `gpt_image_2_6`, quality high, 2k, 16:9, about 2 credits each. Estimate the cost first. Style: dark charcoal or navy, bold white condensed type, muted colored bars. Read the finished image and check every word and number; regenerate if anything is wrong. Save to `x-account/assets/`.
   Historic photos: Wikimedia Commons only, with the license confirmed on the file's own page and a credit line in the post.
6. **Deliver.**
   - Save the pack to `x-account/packs/YYYY-MM-DD-<event>-<session>.md` (post time in UTC, format, text, quote URL or visual file, sources).
   - Add the drafts to `x-account/preview/index.html` and republish the artifact, so George can copy them.
   - Send the drafts in chat, each with its character count and, for quote-posts, the link plus the reminder: open the official post → repost icon → Quote → paste (or paste the link at the end of the post).
   - Commit and push.

## Done well

George can read, edit and post the whole pack in under 5 minutes, and nothing in it could draw a Community Note.
