#!/usr/bin/env node
// Aplica db/migrations/*.sql em ordem, uma vez cada, registrando em
// public.schema_migrations. Use a connection string de MIGRATION (DDL).
//
//   DATABASE_URL_MIGRATION=postgres://... node db/migrate.mjs
//   node db/migrate.mjs --seed     (aplica também db/seed.sql)
//
// 0002_roles.sql é ignorado aqui: ele exige a variável app_password e é
// aplicado à mão com psql (ver MIGRACAO.md).
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const aqui = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL_MIGRATION ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL_MIGRATION (ou DATABASE_URL).");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      nome text PRIMARY KEY,
      aplicada_em timestamptz NOT NULL DEFAULT now()
    )
  `;

  const aplicadas = new Set(
    (await sql`SELECT nome FROM public.schema_migrations`).map((r) => r.nome),
  );

  const arquivos = (await readdir(join(aqui, "migrations")))
    .filter((f) => f.endsWith(".sql") && f !== "0002_roles.sql")
    .sort();

  for (const arquivo of arquivos) {
    if (aplicadas.has(arquivo)) {
      console.log(`= ${arquivo} (já aplicada)`);
      continue;
    }
    const conteudo = await readFile(join(aqui, "migrations", arquivo), "utf8");
    console.log(`→ ${arquivo}`);
    await sql.unsafe(conteudo);
    await sql`INSERT INTO public.schema_migrations (nome) VALUES (${arquivo})`;
  }

  if (process.argv.includes("--seed")) {
    console.log("→ seed.sql");
    await sql.unsafe(await readFile(join(aqui, "seed.sql"), "utf8"));
  }

  console.log("Migrations concluídas.");
} catch (erro) {
  console.error("Falha na migration:", erro.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
