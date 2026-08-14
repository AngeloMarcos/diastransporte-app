---
name: vps-db
description: Connect to and operate the project's own PostgreSQL database once it's migrated off Supabase onto the VPS — direct psql access, running migrations, backups/restore. Use whenever the user asks to query, migrate, back up, or restore the self-hosted database.
---

## Status: schema e dados prontos, rodando só dentro do Docker Compose da VPS (sem acesso ainda)

O projeto hoje roda em produção no Postgres gerenciado pelo Supabase (ver `CLAUDE.md`, seção
"Two backends, one data layer"). O schema equivalente para a VPS **já existe e está
commitado** em `db/`:

- `db/migrations/0001_init.sql` — schema completo (`usuarios`, `sessoes`, `rotas`,
  `conteudo_site`, `agendamentos` + a view `profiles` pra compatibilidade, + o mesmo trigger
  `agendamentos_calcular_valor` que existe no lado Supabase). Sem RLS, sem GRANT de
  PostgREST — autorização é feita na camada de aplicação (`src/lib/vps/auth.server.ts`).
- `db/migrations/0002_roles.sql` — cria a role `dias_app` (CRUD apenas), separada da role de
  migration (DDL). Aplicar manualmente com `psql`, passando `app_password` — não entra no
  runner automático (`db/migrate.mjs` pula esse arquivo de propósito).
- `db/migrate.mjs` — runner idempotente: aplica `db/migrations/*.sql` em ordem, registra em
  `public.schema_migrations`, aceita `--seed` pra aplicar `db/seed.sql` também.
- `db/seed.sql` — dados reais exportados do Supabase em 2026-08-14 (rotas, conteúdo,
  agendamentos históricos com `user_id = NULL`, já que as contas nascem de novo no login
  próprio).
- `db/criar-admins.mjs` — cria/atualiza os 3 admins com senha provisória (bcrypt).
- `db/migrar-imagens.mjs` — baixa as fotos ainda servidas pelo Lovable e reescreve os
  caminhos no banco pra `/api/uploads/...` (disco da VPS).

Falta só o acesso: ninguém rodou esses scripts contra a VPS de verdade ainda (SSH não
autorizado — ver `.claude/skills/vps-deploy/SKILL.md`). Até lá, esse schema só existe dentro
do container `db` do `docker-compose.yml`.

## Como conectar e operar

- **Connection string**: vem do `.env` na VPS (não commitado) — `DATABASE_URL` (role `dias_app`,
  CRUD) e `DATABASE_URL_MIGRATION` (role de migration, DDL). Formato
  `postgres://usuario:senha@host:5432/dias`. Da máquina de dev, via túnel SSH (o Postgres do
  compose não publica porta pra fora): `ssh -L 5433:localhost:5432 deploy@179.197.74.90` e
  então `psql "postgres://...@localhost:5433/dias"`.
- **Rodar uma query pontual**: `psql "$DATABASE_URL" -c "select ..."`.
- **Aplicar migrations novas**: adicionar arquivo em `db/migrations/` seguindo o padrão
  existente (SQL puro, prefixo numérico crescente, idempotente com `IF NOT EXISTS`/
  `CREATE OR REPLACE`), depois `DATABASE_URL_MIGRATION=... node db/migrate.mjs`. Isso roda
  automaticamente a cada deploy via o workflow do GitHub Actions também.
- **Manter os dois schemas em sincronia**: qualquer mudança em `supabase/migrations/*.sql`
  (lado Lovable, ainda em produção) deveria ganhar um equivalente em `db/migrations/*.sql`
  (lado VPS) — e vice-versa, já que `src/lib/dados.ts` espera que os dois tenham o mesmo
  formato de linha para cada tabela.
- **Backup antes de qualquer migration destrutiva**:
  `pg_dump "$DATABASE_URL_MIGRATION" -F c -f backup-$(date +%Y%m%d-%H%M).dump`
- **Restore**: `pg_restore -d "$DATABASE_URL_MIGRATION" --clean --if-exists backup-....dump`
- **RLS**: não existe fora do Supabase. A autorização no lado VPS é 100% na camada de
  aplicação — `exigirUsuario`/`exigirAdmin` em `src/lib/vps/auth.server.ts`, chamados no
  início de toda `createServerFn` em `src/lib/vps/dados.functions.ts`. Se adicionar uma
  tabela/endpoint novo no lado VPS, a checagem de autorização precisa ser escrita à mão ali
  — o banco não vai impedir nada sozinho.

## Antes de rodar algo destrutivo

Sempre confirmar com o usuário antes de `DROP`, `TRUNCATE`, `DELETE` sem `WHERE`, ou restore
que sobrescreve dados existentes — mesmo com acesso concedido. `db/seed.sql` contém dados
reais de clientes (nome, telefone) exportados do banco de produção — tratar como dado
sensível, não como fixture descartável.
