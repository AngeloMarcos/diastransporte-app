#!/usr/bin/env node
// As fotos de hoje são servidas pela CDN do Lovable (caminhos /__l5e/...), que
// não existe na VPS. Este script baixa cada imagem, grava em UPLOADS_DIR e
// reescreve rotas.foto, rotas.galeria e conteudo_site.imagem para /api/uploads/...
//
//   DATABASE_URL=postgres://... UPLOADS_DIR=/var/lib/dias-transporte/uploads \
//   ORIGEM_ASSETS=https://wander-book-craft.lovable.app node db/migrar-imagens.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
const dir = process.env.UPLOADS_DIR ?? "/var/lib/dias-transporte/uploads";
const origem = (process.env.ORIGEM_ASSETS ?? "https://wander-book-craft.lovable.app").replace(
  /\/$/,
  "",
);
if (!url) {
  console.error("Defina DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const cache = new Map();

async function baixar(caminho) {
  // /api/uploads/ já foi migrado antes; /frota/ são as fotos de frota
  // estáticas deste app (public/frota/, ver db/seed.sql) — nunca estiveram
  // no Lovable sob esse caminho, não faz sentido tentar buscá-las lá.
  if (!caminho || caminho.startsWith("/api/uploads/") || caminho.startsWith("/frota/")) {
    return caminho;
  }
  if (cache.has(caminho)) return cache.get(caminho);
  const alvo = caminho.startsWith("http") ? caminho : `${origem}${caminho}`;
  const resposta = await fetch(alvo);
  if (!resposta.ok) {
    console.warn(`! ${alvo} → HTTP ${resposta.status} (mantido como está)`);
    cache.set(caminho, caminho);
    return caminho;
  }
  const ext = (extname(new URL(alvo).pathname) || ".jpg").toLowerCase();
  const nome = `${randomUUID()}${ext === ".jpeg" ? ".jpg" : ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, nome), Buffer.from(await resposta.arrayBuffer()));
  const novo = `/api/uploads/${nome}`;
  cache.set(caminho, novo);
  console.log(`↓ ${caminho} → ${novo}`);
  return novo;
}

try {
  for (const rota of await sql`SELECT id, foto, galeria FROM public.rotas`) {
    const foto = await baixar(rota.foto);
    const galeria = [];
    for (const item of rota.galeria ?? []) galeria.push(await baixar(item));
    await sql`UPDATE public.rotas SET foto = ${foto}, galeria = ${galeria} WHERE id = ${rota.id}`;
  }
  for (const bloco of await sql`SELECT id, imagem FROM public.conteudo_site`) {
    const imagem = await baixar(bloco.imagem);
    await sql`UPDATE public.conteudo_site SET imagem = ${imagem} WHERE id = ${bloco.id}`;
  }
  console.log("Imagens migradas para o disco da VPS.");
} catch (erro) {
  console.error("Falha:", erro.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
