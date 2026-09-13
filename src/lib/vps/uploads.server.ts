// Uploads no disco da VPS. Server-only.
// O diretório é montado como volume (ver docker-compose.yml) e servido pelo
// Caddy/Nginx em produção; a rota /api/uploads/* atende como fallback.
import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { extname, join, resolve } from "path";

export function diretorioUploads(): string {
  return process.env["UPLOADS_DIR"] ?? "/var/lib/dias-transporte/uploads";
}

export async function salvarUpload(conteudo: Uint8Array, extensao: string): Promise<string> {
  const dir = diretorioUploads();
  await mkdir(dir, { recursive: true });
  const nome = `${randomUUID()}.${extensao}`;
  await writeFile(join(dir, nome), conteudo);
  return nome;
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function lerUpload(nome: string): Promise<{ conteudo: Buffer; tipo: string } | null> {
  // Nome sempre gerado por nós (uuid.ext); rejeita qualquer tentativa de path traversal.
  if (!/^[\w-]+\.(jpg|jpeg|png|webp|avif)$/i.test(nome)) return null;
  const dir = resolve(diretorioUploads());
  const caminho = resolve(join(dir, nome));
  if (!caminho.startsWith(dir + "/")) return null;
  try {
    const conteudo = await readFile(caminho);
    return { conteudo, tipo: MIME[extname(nome).toLowerCase()] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}

/** Apaga o arquivo por trás de uma URL de upload, se de fato for uma —
 * achado revisando o pipeline de imagens: cada troca de foto (Editar →
 * trocar → Salvar) grava um arquivo novo e nunca apagava o antigo, nem
 * remover a linha inteira (rota/veículo/foto de galeria/bloco de conteúdo)
 * apagava o arquivo dela — o disco só crescia. Aceita qualquer string
 * (inclusive null/"" ou um caminho de fallback estático tipo /assets/... ou
 * /frota/...) e simplesmente não faz nada se não for um upload de verdade —
 * quem chama não precisa checar antes. */
export async function removerUploadSeForUm(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith("/api/uploads/")) return;
  const nome = url.slice("/api/uploads/".length);
  if (!/^[\w-]+\.(jpg|jpeg|png|webp|avif)$/i.test(nome)) return;
  const dir = resolve(diretorioUploads());
  const caminho = resolve(join(dir, nome));
  if (!caminho.startsWith(dir + "/")) return;
  try {
    await unlink(caminho);
  } catch {
    // Já não existia (ex.: removido antes, ou nunca existiu) — sem problema.
  }
}
