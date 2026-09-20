# Dias Transporte

Site de reservas de transfer e painel de despacho da **Dias Transporte** (São Luís ↔ Lençóis
Maranhenses, MA). Produção: <https://www.diastransporte.site>.

- **Vitrine pública**: rotas e preços, frota, contato/orçamento, páginas legais.
- **Área do cliente**: conta, carrinho, reservas ("Minhas viagens").
- **Painel do motorista**: corridas atribuídas.
- **Painel administrativo**: rotas, frota, conteúdo, agendamentos, leads, pedidos de despacho,
  motoristas, empresas, canais, usuários e trilha de auditoria.

Stack: TanStack Start (React SSR) · Postgres 16 · Tailwind v4 · Docker Compose + Caddy (HTTPS).

## Rodando localmente

```sh
npm install
cp .env.example .env      # preencha DATABASE_URL e SESSION_SECRET
node db/migrate.mjs       # aplica db/migrations/*.sql (opcional: --seed)
npm run dev
```

```sh
npm run lint && npx tsc --noEmit -p tsconfig.json && npm run test && npm run build
```

## Documentação para desenvolvedores

- [`CLAUDE.md`](CLAUDE.md) — arquitetura, convenções e armadilhas do código.
- `.claude/skills/deploy` — como publicar uma mudança; `vps-deploy` — operar o servidor;
  `vps-db` — banco, migrations e backups.
- `infra/` — Caddyfile, backup do Postgres, teste de restauração, bootstrap da VPS.
