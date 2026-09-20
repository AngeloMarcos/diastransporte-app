---
name: deploy
description: Validate and ship a change to production (www.diastransporte.site on the VPS) — use whenever the user asks to commit/push/deploy/publish this repo's changes.
---

## How shipping works

Production is self-hosted (Docker Compose on the VPS, `/opt/diastransporte-app`). A push to
`origin/main` does **not** deploy by itself — deploying is a separate SSH step (below). Say
clearly in your report whether a change is only pushed or also live and verified.

## Steps

1. **Validate, in this order** (stop and fix on the first failure):
   ```sh
   npx tsc --noEmit -p tsconfig.json
   npx eslint <changed files>
   npm run test
   npm run build
   ```
   `tsconfig.json` is strict; on Windows, a wall of `Delete '␍'` prettier errors is CRLF noise —
   `npx eslint --fix <file>`. Add a Vitest test next to any new pure-logic helper. Test a new SQL
   migration before applying it (inside `BEGIN … ROLLBACK` on the server).

2. **Check `git status`**; stage only the files you meant to change (CRLF noise shows many `M`
   files that are not real edits). `src/routeTree.gen.ts` legitimately changes with routes.
   Never hand-edit it.

3. **Commit** with a message that describes the user-facing change (Portuguese, detailed), ending
   with the Co-Authored-By line. Don't amend/rebase pushed commits; never `--force`.

4. **Push**: `git push origin main` (fetch first if unsure).

5. **Deploy** (only when the user wants it live):
   ```sh
   ssh -i ~/.ssh/dias_transporte_claude deploy@179.197.74.90 "cd /opt/diastransporte-app \
     && git fetch -q origin && git reset -q --hard origin/main \
     && docker compose -f docker-compose.staging.yml build app \
     && docker compose -f docker-compose.staging.yml run --rm -T app node db/migrate.mjs \
     && docker compose -f docker-compose.staging.yml up -d --no-deps app"
   ```
   If `infra/Caddyfile` changed: `docker compose -f docker-compose.staging.yml up -d --force-recreate caddy`
   (the file is a single-file bind mount; `caddy reload` would read the old inode).

6. **Verify live** with `curl --resolve www.diastransporte.site:443:179.197.74.90 https://www.diastransporte.site/…`
   (bypasses stale DNS caches): status codes of the main pages, headers, and — for server
   behaviour — a real call. Clean up any test rows you created.
