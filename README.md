# Counter Check

Before you pay a car repair quote, find out if you should be paying at all. A US car owner adds their car, checks a shop quote, and sees which lines are overpriced, not in the maker's schedule, covered by warranty or tied to a recall. The brief and judging criteria are in [`HACKATHON.md`](HACKATHON.md).

- **Live:** _production URL_
- **Pitch deck:** [`pitch/`](pitch/)

## Run locally

Requires Node 20+.

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
npm test                     # Vitest
npm run build
```

| Env var | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access (never exposed to the browser) |
| `ANTHROPIC_API_KEY` | Claude reads quote photos and text into structured lines |
| `STRIPE_SECRET_KEY` | Stripe test-mode checkout |
| `NEXT_PUBLIC_APP_URL` | Base URL for checkout redirects and share links |

Key dependencies: Next.js 15, React 19, Tailwind CSS 4, Supabase JS, Anthropic SDK, Stripe, zod, qrcode, @react-pdf/renderer, Vitest. Car data comes from the free NHTSA vPIC and Recalls APIs.

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
