---
name: run
description: Launch the Dias Transporte site locally (TanStack Start dev server) to verify a change before it ships.
---

## Launching the app

TanStack Start SSR app on Vite; needs a Postgres.

1. `npm install` if `node_modules` is missing.
2. Local Postgres (Docker is easiest): `docker run -d --name dias-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=dias -p 5433:5432 postgres:16-alpine`.
3. `.env` (gitignored) from `.env.example`: `DATABASE_URL`, `DATABASE_URL_MIGRATION`, `SESSION_SECRET` (any long random string), `APP_URL=http://localhost:3000`.
4. `node db/migrate.mjs --seed` to create the schema and load sample data, then create an admin with `ADMIN_SENHA_INICIAL=... node db/criar-admins.mjs` (edit the e-mails in the script first) or insert a row in `usuarios` with `admin = true`.
5. `npm run dev` and read the printed URL. Without a database the public pages still render (routes, fleet and content fall back to static data in `src/data/rotas.ts`), but login, booking and admin need it.
6. Login is at `/auth`; `/admin` needs `usuarios.admin = true`. Stop the dev server (and the container) when done.

For a pre-push check that doesn't need the dev server, see the `deploy` skill.
