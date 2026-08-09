---
name: run
description: Launch the Dias Transporte site locally (TanStack Start dev server) to visually verify a change before it ships.
---

## Launching the app

This is a TanStack Start SSR app (not a plain SPA or a simple CLI), built on Vite.

1. Make sure dependencies are installed: `node_modules` is **not** committed, so run
   `npm install` first if it's missing (check with `ls node_modules` — don't assume).
2. Start the dev server in the background: `npm run dev`. Read its stdout for the actual
   local URL it prints (don't hardcode a port — Vite/TanStack Start picks one and prints it).
3. A local `.env` (gitignored, not committed) supplies `SUPABASE_URL` /
   `SUPABASE_PUBLISHABLE_KEY` etc. If it's missing, route loaders that hit Supabase
   (`listRotas`, `listConteudo` in `src/lib/*.functions.ts`) silently fall back to the
   static data in `src/data/rotas.ts` — the site still renders, just without live DB
   content. Don't treat that fallback as a bug unless you're specifically testing
   Supabase-backed behavior.
4. Most interesting pages require auth state:
   - `/auth` — sign in/up (email+password or Google via Lovable OAuth).
   - `/_authenticated/*` (`/admin`, `/minhas-viagens`) redirect to `/auth` without a session.
   - `/admin` additionally requires a `user_roles` row with `role = 'admin'` for that user
     (see `supabase/migrations/*.sql` for which emails are seeded as admin) — being logged
     in is not enough.
5. Stop the server when done; it's a long-running background process, not a one-shot command.

For a pre-push confidence check that doesn't need the dev server at all (typecheck + lint +
production build), see the `deploy` skill instead.