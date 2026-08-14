# Kit de migração: Dias Transporte → VPS com banco próprio

Objetivo: deixar o projeto capaz de rodar numa VPS sua, sem Lovable Cloud — Postgres próprio, login próprio, fotos no disco do servidor e deploy por GitHub Actions via SSH.

## O que eu não consigo fazer (e fica com você)

- Acessar a VPS por SSH, criar chaves, instalar pacotes, configurar Nginx/Caddy/certbot.
- Alterar DNS. Você aponta um registro `A` do domínio para o IP da VPS (e `AAAA` se houver IPv6).
- Entregar a senha do Postgres ou a service role key do backend atual — no Lovable Cloud essas credenciais não são acessíveis, nem por mim. Não existe connection string direta para eu te passar.
- Exportar `auth.users` (hashes de senha). O acesso que eu tenho aqui cobre só o schema `public`. Como você escolheu login próprio, isso deixa de ser bloqueio: as senhas serão recriadas.

## Situação atual conferida

- Dados a migrar hoje: 9 rotas, 4 blocos de conteúdo do site, 4 perfis, 2 reservas. O bucket de fotos `rotas` está vazio (as imagens em uso hoje vêm de `src/assets/`).
- Todo o schema já está versionado em `supabase/migrations/` (8 arquivos), então ele é a base do banco novo.
- Arquivos acoplados ao backend gerenciado: `useAuth.tsx`, `auth.tsx`, `carrinho.tsx`, `minhas-viagens.tsx`, `admin.tsx`, `_authenticated/route.tsx`, `Header.tsx`, `usuarios.functions.ts`, `start.ts` e os clients em `src/integrations/`.

## O que vou construir

### 1. Camada de banco própria

- Cliente Postgres server-side (`postgres` via pool) lendo `DATABASE_URL`, usado só dentro de server functions.
- Duas roles previstas na documentação e no compose: uma de migration (DDL) e uma de app (CRUD apenas) — o runtime usa a de app.
- Migrations consolidadas em `db/migrations/` num formato aplicável em Postgres puro: mesmas tabelas, mesmo trigger de preço oficial, mesmos índices, sem `auth.*`, sem RLS (a autorização passa a ser feita no servidor) e sem GRANTs do PostgREST.
- Script `db/seed.sql` gerado com os dados reais de hoje (rotas, conteúdo do site, perfis, reservas) para o banco novo já subir com o site completo.

### 2. Autenticação própria

- Tabelas `usuarios` (e-mail, hash da senha com `bcrypt`/`argon2`, nome, telefone) e `sessoes` (token opaco, expiração), substituindo `auth.users` + `profiles` + `user_roles` — o papel de admin vira coluna/tabela própria.
- Server functions de `registrar`, `entrar`, `sair` e `sessaoAtual`, com sessão em cookie `HttpOnly` + `Secure` + `SameSite=Lax`.
- `useAuth` reescrito para consumir a sessão do servidor; o gate `_authenticated` passa a validar no servidor (deixa de depender de `localStorage`).
- Redefinição de senha: como você não vai ter SMTP nesta fase, o reset fica na mão do admin (o painel já tem esse fluxo). Se depois quiser link por e-mail, adiciono com SMTP.
- Os 3 admins atuais (mentoark@, angelobispofilho@, stefanocatedral@) são criados por script com senha provisória definida no primeiro deploy — as senhas antigas não vêm.

### 3. Storage no disco da VPS

- Upload passa a gravar em `/var/lib/dias-transporte/uploads`, montado como volume; leitura por uma rota estática servida pelo Nginx/Caddy.
- Validação no upload: só imagens, limite de 10 MB (hoje o bucket não tem limite).
- O painel admin continua igual para quem usa; muda só o destino do arquivo.

### 4. Empacotamento e deploy

- `Dockerfile` (build do TanStack Start + runtime) e `docker-compose.yml` com app + Postgres + volume de uploads.
- `.env.example` com todas as variáveis necessárias (`DATABASE_URL`, `SESSION_SECRET`, caminho de uploads, URL pública).
- Workflow `.github/workflows/deploy.yml`: no push para `main`, conecta por SSH, faz build, roda as migrations e reinicia o container. Você cadastra os segredos `SSH_HOST`, `SSH_USER`, `SSH_KEY` no GitHub — eu não preciso vê-los.
- `MIGRACAO.md`: passo a passo do servidor (instalar Docker, subir o compose, Caddy com HTTPS automático, `pg_dump`/`pg_restore` para backup, e o DNS a criar).

## Detalhes técnicos

- Nada do Lovable Cloud é apagado neste sprint: o código novo fica atrás das variáveis de ambiente, então o site publicado continua funcionando até você virar o DNS. A remoção de `@lovable.dev/cloud-auth-js` e dos clients Supabase acontece num passo final, quando você confirmar que a VPS está no ar.
- O trigger de preço oficial em `agendamentos` é reescrito em SQL puro (sem `SECURITY DEFINER` dependente de roles Supabase) e continua sendo a fonte do valor.
- A validação de acesso admin sai da RLS e passa a viver nas server functions, checando a sessão no servidor a cada chamada.
- Sessões e senhas ficam só no Postgres da VPS; `SESSION_SECRET` é gerado no deploy.
