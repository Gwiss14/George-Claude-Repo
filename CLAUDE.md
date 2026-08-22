# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## Current state of the repository

**This repository contains no application code yet.** As of the latest commit it holds
exactly two tracked files:

```
.
├── README.md    # two lines: title + "For Claude Code on my phone"
└── CLAUDE.md    # this file
```

There is no source tree, no package manifest (`package.json`, `pyproject.toml`,
`go.mod`, …), no dependency lockfile, no test suite, no linter or formatter config,
no CI workflows under `.github/`, and no build tooling.

Do not infer a stack that isn't here. If you need to know how something is built or
tested, the answer right now is "nothing is — it hasn't been chosen yet." Ask the
user rather than assuming a framework.

## What this repository is for

It is a personal scratch repository owned by `Gwiss14`, created as a working target
for Claude Code sessions started from a phone (the web/mobile client). Sessions run
in an ephemeral remote container: the repo is cloned fresh at session start and the
container is reclaimed afterwards, so **anything not committed and pushed is lost.**

Practical consequences:

- Commit and push work before ending a session — there is no "come back to it later"
  on disk.
- Prompts may be short and typed on a phone. Prefer asking one focused clarifying
  question over guessing at length.
- Expect requests to start new projects from scratch here rather than modify existing
  code.

## Git conventions

These are the only conventions the repository actually establishes today, and they
matter because two of them are easy to get wrong.

**Default branch is `Master` — capital `M`.** Not `main`, not lowercase `master`.
Commands that assume the usual name will fail. Always target it explicitly:

```bash
git fetch origin Master
```

**Feature branches use the `claude/<short-slug>` prefix**, e.g.
`claude/claude-md-docs-p14te2`. Session tooling assigns a branch name per task;
develop on the assigned branch, create it locally if it doesn't exist, and never
push to a different branch without explicit permission.

**Push with upstream tracking:**

```bash
git push -u origin <branch-name>
```

Retry on network failure with exponential backoff (2s, 4s, 8s, 16s) — up to four
attempts. Retry only for network errors, not for rejected pushes.

**Do not open a pull request unless the user explicitly asks for one.** Pushing the
branch is the deliverable by default.

**Never rewrite published history** (no `rebase`, `amend`, or force-push on a branch
that has been pushed) unless the user asks for it directly.

## Working conventions

- **Small, descriptive commits.** One logical change per commit; imperative subject
  line ("Add …", "Fix …", not "Added …").
- **Do not add model identifiers** (`claude-opus-5`, marketing names, etc.) to commit
  messages, PR bodies, code comments, or any other file pushed to the repo. Keep that
  to chat replies.
- **No secrets in the repo.** No API keys, tokens, or `.env` files with real values.
  If a project added here needs configuration, commit a `.env.example` with
  placeholder values and add `.env` to `.gitignore`.
- **Verify before claiming done.** If a command was run, report its real output; if a
  step was skipped or a test failed, say so plainly.

## When code is added to this repository

The first substantive commit should establish the missing scaffolding, and this file
should be updated in the same change. At minimum, add and then document here:

1. **A dependency manifest and committed lockfile** for whichever ecosystem is chosen.
2. **A `.gitignore`** appropriate to that ecosystem (this repo currently has none, so
   build output and dependency directories would otherwise be committed by accident).
3. **The exact commands** for install, run, build, test, lint, and format — copy-pasteable,
   not described in prose. This is the single most useful thing this file can contain
   and it is the section to write first.
4. **The directory layout**, with one line per top-level directory explaining what
   belongs in it.
5. **Non-obvious conventions only** — naming rules, module boundaries, error-handling
   patterns, anything a competent developer would get wrong on their first attempt.
   Do not restate general good practice; it wastes the reader's attention.

Keep this file current. When a command in it stops working, the file is a liability
rather than an asset — fix it as part of the change that broke it.
