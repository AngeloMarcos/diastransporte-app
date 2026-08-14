// Uploads no disco da VPS. Server-only.
// O diretório é montado como volume (ver docker-compose.yml) e servido pelo
// Caddy/Nginx em produção; a rota /api/uploads/* atende como fallback.
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
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

export async function lerUpload(
  nome: string,
): Promise<{ conteudo: Buffer; tipo: string } | null> {
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
