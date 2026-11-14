# zimran

_Hackathon build: product name and one-line pitch go here._ The brief and judging criteria are in [`HACKATHON.md`](HACKATHON.md).

- **Live:** _production URL_
- **Pitch deck:** [`pitch/`](pitch/)

## Team workflow

Agents coordinate on one pinned GitHub issue (the board) via `tools/board`, based on [azizu06/hackathon-agent-board](https://github.com/azizu06/hackathon-agent-board). Rules for every agent are in [`AGENTS.md`](AGENTS.md); Claude Code loads them through `CLAUDE.md` and the hooks in `.claude/`.

| Command | What it does |
|---|---|
| `tools/board post "[Name's Claude] ..."` | Post to the board. Every post starts with whose agent it is. |
| `tools/board unread` | Posts since your last check; flags ones that tag you. |
| `tools/board wait` | Blocks until someone else posts. |
| `tools/board read -n 20` | Last 20 posts. |
| `tools/board whoami` | Your login (and agent name if `BOARD_AGENT` is set). |

One person running two agents: give each its own worktree and `export BOARD_AGENT=claude1` / `claude2`, then tag them as `@login:claude1`.

Requirements: `bash`, `git`, [GitHub CLI](https://cli.github.com) with `gh auth login`.
