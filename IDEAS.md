# Vibe Coding Ideas

Small, high-payoff projects you can build in one sitting from a phone or a laptop.
Rules of the game: **one file if possible, visible result in under an hour, no build step.**

Each idea has a starter prompt you can paste straight into Claude Code.

---

## Tier 1 — Single-file, instant payoff

### 1. Thumbnail A/B Arena
A page that shows two YouTube thumbnails side by side and asks "which would you click?"
Tracks votes, computes a win rate, ranks your whole thumbnail library by ELO.

- **Stack:** one HTML file + localStorage (or an artifact with a shared DB if you want real votes from friends)
- **Why it vibes:** it's a game, it's genuinely useful for a creator, and the leaderboard is instantly satisfying
- **Starter prompt:** *"Build a single-file HTML thumbnail ELO arena. I drop in image URLs, it pairs them randomly, I click a winner, it keeps ELO ratings in localStorage and shows a ranked table with win rates."*

### 2. Title Grader
Paste a video title, get a score out of 100 with a breakdown: curiosity gap, length, power words,
number presence, emotional charge. Pure heuristics, no API needed — the scoring rubric *is* the app.

- **Stack:** one HTML file, ~200 lines of scoring logic
- **Why it vibes:** you'll argue with the scores, then tune the rubric, then argue again. That loop is the fun.
- **Starter prompt:** *"Single-file title grader for YouTube titles. Score 0-100 across 5 weighted dimensions, show a radar chart of the breakdown, and suggest 3 rewrites."*

### 3. Life in Weeks
A grid of 4,000 squares — one per week of a ~78 year life. Fill in the ones you've lived.
Overlay milestones (school, jobs, moves) as colored bands.

- **Stack:** one HTML file, CSS grid, a JSON array of milestones
- **Why it vibes:** takes 20 minutes, hits like a truck
- **Starter prompt:** *"Life-in-weeks visualizer. Birth date input, 52x78 grid, past weeks filled, milestone ranges colored with a legend, hover shows the date range."*

### 4. Keyboard-Only Task Bar
A tiny launcher: hit a hotkey, type `t buy milk tomorrow`, it parses natural-language dates and
fires a task into Todoist. No UI beyond one input box.

- **Stack:** small Node script or a browser extension popup
- **Why it vibes:** you'll actually use this every day, which is rare for a weekend project
- **Starter prompt:** *"CLI tool `t` that parses natural-language task strings ('buy milk tomorrow 3pm p1 #errands') into structured fields and prints the parse for confirmation before sending."*

---

## Tier 2 — Weekend projects with a real hook

### 5. Inbox Autopsy
Point it at an mbox export or a folder of emails. It renders: who emails you most, your median
reply latency by sender, the time-of-day heatmap of your sending, your longest-dead thread.

- **Stack:** Python for parsing → JSON → one HTML dashboard
- **Why it vibes:** personal data you've never seen visualized, and the "median reply latency by sender" chart is quietly brutal
- **Starter prompt:** *"Parse an mbox file into a JSON summary (per-sender counts, reply latencies, hour-of-day histogram), then render a single-file dashboard from that JSON."*

### 6. Commit Rhythm
Feed it a git repo. It draws your commit history as a music-staff-like timeline: bars for days,
height for lines changed, color for file type. Scrub through your own project's heartbeat.

- **Stack:** `git log --numstat` → JSON → SVG/canvas
- **Why it vibes:** every repo looks different, and you'll immediately want to run it on five more
- **Starter prompt:** *"Script that turns `git log --numstat` into a JSON timeline, plus a single-file visualizer showing commits as a scrubbing timeline with churn as bar height."*

### 7. Decision Journal
Log a decision, your confidence %, and what you expect to happen. It hides the entry.
Months later it resurfaces and asks: were you right? Builds a personal calibration curve over time.

- **Stack:** small web app with a real database (or an artifact with a shared DB)
- **Why it vibes:** the payoff arrives months later, which makes it one of the rare tools that gets *better* the longer it sits
- **Starter prompt:** *"Decision journal app: log decision + confidence + expected outcome + review date. Resurfaces entries past their review date for scoring. Shows a calibration plot of stated confidence vs actual hit rate."*

### 8. Explain This Diff
A page where you paste a git diff and it renders a reviewer's-eye summary: what changed, what's
risky, what tests are missing. Wire it to the Claude API and it becomes a genuine pre-push check.

- **Stack:** small Node server + the Anthropic SDK + one HTML page
- **Why it vibes:** it's the shortest path from "toy" to "thing I run before every push"
- **Starter prompt:** *"Local web tool: paste a diff, get a structured review (summary, risk flags, missing tests) from the Claude API, rendered as collapsible cards."*

---

## Tier 3 — Weird and worth it

### 9. Dithered Webcam
Live webcam feed through a Floyd-Steinberg dither into a 1-bit Mac Classic aesthetic.
Sliders for threshold, palette, and pixel size. Screenshot button.

- **Stack:** one HTML file, canvas, `getUserMedia`
- **Starter prompt:** *"Single-file webcam dither toy: Floyd-Steinberg error diffusion to 1-bit, adjustable pixel size and palette, PNG export."*

### 10. Sorting Algorithm Racetrack
Six sorting algorithms racing the same array in parallel lanes, with a comparison counter ticking
up per lane. Speed slider. Pick your array size and watch bubble sort embarrass itself.

- **Stack:** one HTML file, canvas, generator functions so each algorithm can be stepped
- **Starter prompt:** *"Single-file sorting race: 6 algorithms as generators stepping in lockstep across parallel canvas lanes, live comparison/swap counters, speed and size controls."*

### 11. Boids in a Box
Classic flocking — separation, alignment, cohesion — with live sliders for each weight, a predator
that follows your cursor, and trails. Twenty minutes to build, an hour lost to tuning sliders.

- **Stack:** one HTML file, canvas
- **Starter prompt:** *"Boids simulation, single file. Sliders for separation/alignment/cohesion weights and perception radius, cursor acts as a predator, optional motion trails."*

### 12. Regex Playground That Explains Itself
Type a regex, get a plain-English breakdown token by token, plus a live-highlighted test string
and a generated example that matches.

- **Stack:** one HTML file, a small regex parser
- **Why it vibes:** writing the explainer forces you to actually learn the grammar
- **Starter prompt:** *"Single-file regex explainer: parse the pattern into tokens, describe each in plain English as a tree, highlight matches in a test string live."*

---

## How to start any of these

1. Pick one. Don't pick three.
2. Paste the starter prompt. Get *something* on screen before you have opinions.
3. Then iterate in small asks: "make the bars thicker", "add a dark mode", "this feels slow, why?"
4. Commit at every point where it still works. That's the whole discipline.

The best vibe-coding projects are the ones where the *tuning* is the fun part —
sliders, weights, rubrics, palettes. Build the knobs, then play with them.
