# Revisão para deploy em VPS — car-fleet-co

Data: 2026-07-27

## Arquitetura atual (o que o código realmente é)

O projeto não é um SPA simples com Supabase no browser — é uma app **TanStack Start** (SSR, Nitro por baixo). O fluxo de dados é:

Browser → server functions do TanStack Start (`*.functions.ts`) → `supabase-js` (anon key + Bearer token do usuário) → API REST do projeto Supabase Cloud (`plinjmanogrzoybkbiyy.supabase.co`) → Postgres com RLS.

Login usa `supabase.auth.getSession()`/`getClaims()` (GoTrue). Operações administrativas (criar motorista, promover admin) usam `supabaseAdmin.auth.admin.*` — API administrativa do GoTrue, com a service role key isolada em `client.server.ts`.

## O que já está bem encaminhado para portabilidade

- Migrations em SQL padrão, organizadas e sequenciais, sem depender de nada exclusivo do dashboard do Supabase.
- RLS é usado de forma correta e é nativo do Postgres — sem trigger algum peculiar do Supabase Cloud.
- Regra de transição de status centralizada em função SQL (`fn_transicionar_status`) com `SECURITY DEFINER`, exatamente como pedido — a lógica de negócio mora no banco, não espalhada no frontend.
- Sem Edge Functions, sem Supabase Storage. Voucher é gerado 100% client-side com `jsPDF`.
- Service role key isolada em `client.server.ts` (nunca chega ao bundle do cliente).
- `.env` só tem a anon/publishable key (pública por natureza); a service role key não está versionada.

## Bloqueadores reais para rodar na VPS

### 1. Build alvo é Cloudflare Workers, não Node (crítico)
`vite.config.ts` usa `@lovable.dev/vite-tanstack-config`, cujo comentário no topo do arquivo diz literalmente: *"nitro (build-only using cloudflare as a default target)"*. `src/server.ts` exporta um handler `fetch(request, env, ctx)` — assinatura de Workers, não de servidor Node. O `.gitignore` também trata `.wrangler/` e `.dev.vars` como artefatos esperados.

Isso significa que, do jeito que está, `vite build` gera um artefato pensado para rodar em Cloudflare Workers, não um processo Node que sobe numa VPS. Antes de colocar na VPS é preciso trocar o preset do Nitro para `node-server` (ou equivalente) e validar que `server.ts`/`start.ts` continuam funcionando com esse runtime.

### 2. Acoplamento real ao GoTrue (auth do Supabase), não só ao Postgres
As migrations chamam `auth.uid()` dentro das policies de RLS e da função `fn_transicionar_status`/`fn_atribuir_motorista`. Isso depende da extensão/role que o Supabase injeta no Postgres (o GUC `request.jwt.claims`, populado pelo PostgREST a partir do JWT do GoTrue). Além disso:

- `motoristas.functions.ts` usa `supabaseAdmin.auth.admin.createUser`, `listUsers`, `deleteUser` — API administrativa do GoTrue, não SQL.
- A migration `20260715003656` faz `UPDATE auth.users` diretamente — schema gerenciado pelo GoTrue.

Ou seja: "Postgres self-hosted" só resolve a metade do problema. Para essas partes continuarem funcionando sem reescrever autenticação, a VPS precisa rodar a **stack Supabase self-hosted completa** (Postgres + GoTrue + PostgREST + um gateway tipo Kong), não um Postgres solitário com um backend Node customizado.

Isso é compatível com o que as instruções do projeto já previam ("Supabase Auth pode ser usado... facilita trocar o provedor depois sem tocar no domínio"), mas vale confirmar que essa é mesmo a intenção para a VPS — é uma decisão de infraestrutura, não só de código.

### 3. Variáveis de ambiente apontam para o projeto Cloud
`SUPABASE_URL`/`VITE_SUPABASE_URL` apontam para `plinjmanogrzoybkbiyy.supabase.co` (projeto hospedado, usado pelo Lovable). Na VPS, essas variáveis (e `SUPABASE_SERVICE_ROLE_KEY`, que hoje só existe como secret fora do repo) precisam apontar para o gateway self-hosted, com as chaves do stack novo.

### 4. Gerenciador de pacotes
O lockfile é `bun.lock`. A VPS precisa ter o Bun instalado (ou o lockfile precisa ser convertido para npm/pnpm) para o build ser reprodutível.

## Decisão que falta tomar antes de eu mexer em código

Duas rotas possíveis, com custos bem diferentes:

1. **Self-hostar a stack Supabase inteira na VPS** (Postgres + GoTrue + PostgREST + Kong via Docker Compose). Quase todo o código atual continua igual — só trocam URLs/chaves e o preset do Nitro. É o caminho mais barato e o que as instruções do projeto já sugerem.
2. **Sair do GoTrue/PostgREST e ir para Postgres puro + backend Node/Express próprio.** Mais alinhado a "Postgres self-hosted" no sentido literal, mas exige reescrever autenticação (emissão/validação de JWT, admin de usuários), o middleware de auth, os clients Supabase e trocar `auth.uid()` nas policies/funções por alguma outra fonte de identidade — retrabalho grande para um MVP que já está funcionando.

## Próximos passos sugeridos

1. Confirmar qual das duas rotas acima é a intenção (isso muda o plano inteiro).
2. Trocar o preset do Nitro em `vite.config.ts`/`tanstackStart` para um alvo Node e validar `vite build && node .output/server/index.mjs` localmente antes de tocar em infra.
3. Provisionar a stack escolhida na VPS e migrar as 5 migrations existentes rodando-as em ordem contra o novo Postgres.
4. Apontar `.env` de produção para o novo endpoint e testar login + `fn_transicionar_status` fim a fim.
