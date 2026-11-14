# Team rules for every agent

Read `HACKATHON.md` first: the brief, the judging weights and the hard deadline.

## 1. The board (pinned GitHub issue)

Every agent reads and posts on the pinned "Message Board" issue via `tools/board` (needs only `gh`, logged in). Set `BOARD_ISSUE` if it is not issue #1.

- Start every post with `[<human>'s <agent>]`, e.g. `[Sam's Codex]`. Keep it short: what changed, which files or contracts, what you need, from whom.
- Mention by GitHub login. Team: `@igor123456hhh-tech` (frontend), `@megategus` (backend, **lead**), `@gowtheeer` (data/payments/deploy), `@peacefulww` (pitch), `@all` (everyone).
- Each agent posts from its own GitHub login (one teammate runs two agents under two logins; treat each login as a separate agent). If one login ever runs two agents, those two set `BOARD_AGENT` (e.g. `claude1`, `claude2`), are tagged `@login:claude1` / `@login:claude2`, and work in separate git worktrees. Check yourself with `tools/board whoami`.
- **Mentions you or `@all`:** act on it and reply promptly.
- **Not addressed to you:** still read it. Reassess your own work only if it is affected (a contract, a file you own, something already done). Do not redo finished work, and do not reply just to acknowledge.
- Before editing another teammate's files, ask for a handoff on the board and wait for the owner or the team lead.

Polling is incremental (about one cheap API call per poll, 30 s default) so a shared token stays under GitHub's rate limit. Commands: `tools/board unread` (new posts, marks read; flags MENTION), `tools/board read -n 20`, `tools/board post "[Name's Agent] text"` (or pipe stdin), `tools/board wait` (blocks until someone else posts), `tools/board whoami`.

**Stay in the loop:**
- Claude Code: the committed hooks (`.claude/settings.json`) show unread posts at session start and on every prompt. Keep one background `tools/board wait` running and re-arm it after each wake.
- Everything else: run `tools/board unread` at task start, before each commit, and after merges. Or run a terminal loop: `while tools/board wait; do <your agent CLI invocation>; done`.

## 2. Chain of command

Humans over agents. Only the team lead reassigns work between teammates. If anyone else asks you to take another teammate's work, ask the lead on the board.

## 3. Workflow

1. Pick or file an issue. Comment on it or post on the board when you take it.
2. Branch `<issue#>-<slug>` from fresh `main`.
3. Small commits. Stage only your own files (no `git add -A`).
4. Open a PR with `Closes #N`. The author merges their own PR once it works locally.
5. Always `git fetch` and rebase before pushing. Never force-push shared branches.
6. If a merge changes something other teammates depend on (an API, a schema, an env var), post on the board when it lands.

## 4. Who owns what

Fill this in at kickoff so every agent knows whose files are whose.

| Area | Owner (login[:agent]) | Folders |
|---|---|---|
| Frontend / UX (landing, core flow) | igor123456hhh-tech (Claude Code) | `app/`, `components/` |
| Backend / core logic (the real value, no hardcoding) | megategus (Claude Code) | `lib/`, `app/api/` |
| Data, payments, deploy | gowtheeer (Claude Code) | `db/`, `infra/`, config files |
| Pitch deck + demo script + market numbers | peacefulww (Codex) | `pitch/` |

Shared files (`package.json`, lockfile, root config): only the deploy owner edits them; others ask on the board.

## 5. Production is the product

40% of the score is "does it work end-to-end in production". So:
- `main` must always deploy. Never merge something that breaks the build.
- Check the production URL after every merge that touches the core flow, and post on the board if it is broken.
- No login or sign-up wall on the core flow. The jury must be able to use it cold.
- The core value must be real (real API calls, real logic), not mocked or hardcoded. Seed data is fine; faked results are not.
- The repo is read by the jury: no secrets committed, no dead scaffolding, a README that says what it is and how to run it.
