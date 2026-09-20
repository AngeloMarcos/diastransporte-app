---
name: vps-deploy
description: Operate the Dias Transporte app on its VPS — logs, restart, rollback, Caddy/HTTPS, backups. Use whenever the user asks to check logs, restart, roll back, or fix something on the server.
---

## Where things are

- Host `179.197.74.90` (Hostinger, Debian), user `deploy`, key `~/.ssh/dias_transporte_claude`.
- App: `/opt/diastransporte-app`, compose file `docker-compose.staging.yml` (the name is historical; it is the production stack): services `app`, `db` (Postgres 16, volume `diastransporte-app_db`), `caddy` (80/443, Let's Encrypt for `www.diastransporte.site`), `autoheal`. The app is **not** published on any host port; only Caddy is.
- Old stacks `/opt/dias-transporte` and `/opt/car-fleet-co` are stopped (volumes kept). Do not start the old Caddy: it would fight the new one for 80/443.
- DNS lives in the Hostinger panel (owner-managed): `A www → 179.197.74.90`. The apex `@` is not set up; its Caddy block is commented out in `infra/Caddyfile`.

## Everyday commands (prefix: `cd /opt/diastransporte-app && docker compose -f docker-compose.staging.yml`)

- Logs: `… logs -f --tail=200 app` (or `db`, `caddy`). Status: `… ps`.
- Restart without rebuild: `… restart app`. Deploy: see the `deploy` skill.
- Rollback: `git reset --hard <previous-commit>`, `… build app`, `… up -d --no-deps app` (migrations only move forward — never roll back schema by hand without a backup).
- Caddyfile change: `… up -d --force-recreate caddy` (the single-file bind mount goes stale after `git reset`).
- Secrets live in `/opt/diastransporte-app/.env` (not in git; a copy of the previous one is in `/home/deploy/backups/`). Changing `APP_URL` changes the cookie `Secure` flag.

## Backups

`infra/backup-postgres.sh` (copy at `/home/deploy/backup-postgres.sh`, systemd timer daily ~04:00, 14 days kept in `/home/deploy/backups`) dumps every database it finds running plus the uploads volume; stopped stacks are skipped. To prove a restore works: `scp infra/testar-restauracao.sh deploy@VPS:/tmp/ && ssh deploy@VPS bash /tmp/testar-restauracao.sh` (never pipe it through `ssh bash -s`).

## Before touching production

Confirm with the user before anything that can cause downtime or data loss (restart during business hours, `down`, volume removal, restore over live data, `git reset --hard` on the server when there are uncommitted changes). Never run destructive commands without checking exactly what they affect.
