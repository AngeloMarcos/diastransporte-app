// Upload de imagens no disco da VPS (substitui o bucket de storage gerenciado).
// POST multipart/form-data com o campo "arquivo". Só admin autenticado.
import { createFileRoute } from "@tanstack/react-router";

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const LIMITE_BYTES = 10 * 1024 * 1024; // 10 MB

const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const Route = createFileRoute("/api/uploads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { lerCookieSessao, exigirAdmin } = await import("@/lib/vps/auth.server");
        try {
          await exigirAdmin(lerCookieSessao(request.headers.get("cookie")));
        } catch {
          return new Response("Acesso restrito.", { status: 401 });
        }

        const form = await request.formData();
        const arquivo = form.get("arquivo");
        if (!(arquivo instanceof File)) {
          return new Response("Envie o campo 'arquivo'.", { status: 400 });
        }
        if (!TIPOS.has(arquivo.type)) {
          return new Response("Formato não aceito. Use JPG, PNG, WebP ou AVIF.", { status: 415 });
        }
        if (arquivo.size > LIMITE_BYTES) {
          return new Response("Imagem acima de 10 MB.", { status: 413 });
        }

        const { salvarUpload } = await import("@/lib/vps/uploads.server");
        const nome = await salvarUpload(
          new Uint8Array(await arquivo.arrayBuffer()),
          EXTENSOES[arquivo.type] ?? "jpg",
        );
        return Response.json({ url: `/api/uploads/${nome}` });
      },
    },
  },
});
