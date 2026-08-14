---
name: vps-deploy
description: Deploy and operate the Dias Transporte app on its own VPS once it stops being deployed via "git push origin main" to Lovable — SSH build/restart, reading logs, rollback. Use whenever the user asks to deploy, restart, check logs, or roll back the VPS-hosted app.
---

## Status: código pronto, aguardando autorização SSH na VPS

Alvo confirmado: `root@179.197.74.90` (`srv1829771.hstgr.cloud`). Decisões já tomadas e **já
implementadas no repo**: auth próprio no app (`src/lib/vps/`), fotos em disco na VPS
(`/api/uploads`), deploy via GitHub Actions por SSH.

O que já existe e está commitado, pronto para rodar assim que houver acesso:
- `docker-compose.yml` + `Dockerfile` — stack `db` (Postgres 16) + `app` (nitro preset
  `node_server`, `VITE_AUTH_MODE=vps`), porta 3000 só em `127.0.0.1` (Caddy/Nginx do host
  faz o proxy/HTTPS).
- `.github/workflows/deploy.yml` — dispara a cada push em `main`: SSH na VPS, `git reset
  --hard origin/main`, rebuild do container `app`, roda `db/migrate.mjs` com a role de
  migration, sobe `app`, confere `curl` no site. Precisa dos secrets do repo `SSH_HOST`,
  `SSH_USER`, `SSH_KEY`, `SSH_PORT` (opcional) — nenhum foi criado ainda.
- `infra/vps-bootstrap.sh` — script idempotente pra autorizar as chaves, criar o usuário
  `deploy`, e endurecer a VPS (`bash infra/vps-bootstrap.sh {keys|deploy|harden|lockdown|all}`).

O que falta, na ordem:
1. Autorizar as duas chaves ed25519 já geradas localmente no `authorized_keys` da VPS —
   `~/.ssh/dias_transporte_claude` (uso interativo) e `~/.ssh/dias_transporte_deploy_ci`
   (vira o secret `SSH_KEY` do GitHub Actions). Rodar `infra/vps-bootstrap.sh keys` (como
   root, via Terminal web do painel Hostinger ou senha de root uma única vez) — **o
   gerenciador de "Chave SSH" do painel só injeta em VPS novas, não numa já rodando.** Não
   confiar em quem disser "adicionei a chave" sem prova real; testar sempre com
   `ssh -i ~/.ssh/dias_transporte_claude root@179.197.74.90 "echo ok"`.
2. Rodar `infra/vps-bootstrap.sh deploy` (cria o usuário `deploy` com sudo) e depois
   `harden` (ufw + fail2ban + atualizações automáticas). Só rodar `lockdown` (desativa
   root/senha por SSH) **depois** de confirmar que `ssh deploy@179.197.74.90` funciona.
3. Clonar o repo em `/opt/dias-transporte` na VPS, copiar `.env.example` → `.env` e
   preencher (`POSTGRES_PASSWORD`, `SESSION_SECRET` via `openssl rand -hex 32`, `APP_URL`).
4. `docker compose up -d db`, aplicar `db/migrations/0002_roles.sql` manualmente com a role
   de migration (exige a variável `app_password`, ver comentário no arquivo), então
   `DATABASE_URL_MIGRATION=... node db/migrate.mjs --seed` pra schema + dados reais.
5. `ADMIN_SENHA_INICIAL=... node db/criar-admins.mjs` pra criar os admins com senha
   provisória (troque no primeiro acesso).
6. `docker compose up -d app`, conferir que o site responde.
7. Configurar os secrets do GitHub Actions e testar um push em `main` de verdade.

## Como operar depois de tudo isso rodando

- **Deploy**: automático a cada push em `main` (workflow acima). Manual: `workflow_dispatch`
  pela aba Actions do GitHub, ou direto na VPS:
  `ssh deploy@179.197.74.90 "cd /opt/dias-transporte && git pull && docker compose up -d --build app"`
- **Logs**: `ssh deploy@179.197.74.90 "docker compose logs -f --tail=200 app"` (ou `db` pro
  Postgres).
- **Restart sem rebuild**: `ssh deploy@179.197.74.90 "cd /opt/dias-transporte && docker compose restart app"`
- **Rollback**: `git reset --hard <commit-anterior>` na VPS + `docker compose up -d --build app`
  (não há releases versionadas separadas hoje — considerar isso se downtime de rebuild virar
  problema).
- **Migração de imagens**: `db/migrar-imagens.mjs` baixa fotos do site Lovable ainda em
  produção e reescreve os caminhos pro disco da VPS — rodar uma vez, depois do seed, antes de
  cortar o tráfego pra VPS.

## Antes de mexer em produção

Sempre confirmar com o usuário antes de restart/deploy que pode causar downtime, e nunca
rodar comandos destrutivos (`rm -rf`, `docker system prune`, `git reset --hard` sem checar o
que será descartado, etc.) na VPS sem checar exatamente o que será afetado.
