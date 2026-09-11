#!/usr/bin/env node
// Aplica db/migrations/*.sql em ordem, uma vez cada, registrando em
// public.schema_migrations. Use a connection string de MIGRATION (DDL).
//
//   DATABASE_URL_MIGRATION=postgres://... node db/migrate.mjs
//   node db/migrate.mjs --seed     (aplica também db/seed.sql)
//
// 0002_roles.sql é ignorado aqui: ele exige a variável app_password e é
// aplicado à mão com psql (ver MIGRACAO.md) — por isso é o único arquivo
// que ainda tem BEGIN/COMMIT próprio. Os demais NÃO devem ter BEGIN/COMMIT
// no arquivo: a transação é aberta aqui (sql.begin), envolvendo tanto o
// DDL quanto o INSERT em schema_migrations. Achado revisando integridade
// de schema: antes, cada arquivo abria/fechava sua própria transação, então
// um crash entre o COMMIT do arquivo e o INSERT de bookkeeping (linha
// abaixo) deixava o schema já alterado mas schema_migrations sem registro
// — a próxima execução tentava reaplicar o arquivo inteiro, e statements
// não-idempotentes (ex.: ADD CONSTRAINT sem IF NOT EXISTS) quebravam com
// "already exists" até alguém arrumar a mão. Com os dois na mesma
// transação, ou os dois commitam juntos, ou nenhum dos dois.
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
    await sql.begin(async (tx) => {
      await tx.unsafe(conteudo);
      await tx`INSERT INTO public.schema_migrations (nome) VALUES (${arquivo})`;
    });
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
