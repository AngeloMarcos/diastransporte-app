---
name: vps-db
description: Operate the project's PostgreSQL database on the VPS — psql access, migrations, backups/restore, safe data fixes. Use whenever the user asks to query, migrate, back up, or restore the database.
---

## The database

Postgres 16 in the `db` container (database `diasapp`; not published outside the compose network).
Two roles: `diasapp_migration` (owner/DDL, used by `db/migrate.mjs` and for admin fixes) and
`dias_app` (runtime, CRUD only). Schema = `db/migrations/*.sql`, applied in order and tracked in
`public.schema_migrations`. There is no RLS: authorization is in the server functions
(`exigirUsuario` / `exigirAdmin` / `exigirMotorista`), so every new endpoint must check it by hand.

## Operating

- psql on the server: `ssh deploy@179.197.74.90 "cd /opt/diastransporte-app && docker compose -f docker-compose.staging.yml exec -T db psql -U diasapp_migration -d diasapp -c '…'"`. Multi-line SQL: pipe a heredoc into `psql` (with `exec -T`).
- New migration: add `db/migrations/00NN_nome.sql` (plain SQL, next number, idempotent: `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP TRIGGER IF EXISTS`). Test it first inside `BEGIN … ROLLBACK` with checks (savepoints for expected failures), then deploy — the deploy step runs `node db/migrate.mjs`. New tables get `dias_app` grants from default privileges; sequences need an explicit `GRANT USAGE, SELECT`.
- Backup before a destructive change: run `/home/deploy/backup-postgres.sh`, or `pg_dump -Fc` inside the container. Prove restores with `infra/testar-restauracao.sh` (see the `vps-deploy` skill).
- Reset a user's password (no e-mail flow exists): generate a bcrypt hash (cost 12) with `bcryptjs` inside the app container and `UPDATE usuarios SET senha_hash = …, tentativas_falhas = 0, bloqueado_ate = NULL`; delete that user's rows in `sessoes`. Never put passwords in files.
- `auditoria` is append-only by design (UPDATE/DELETE revoked) — a stray audit row from a test stays.

## Before anything destructive

Confirm with the user before `DROP`, `TRUNCATE`, `DELETE` without `WHERE`, or a restore over live data. `db/seed.sql` holds real names/phones exported from the old system — treat it as sensitive.
