// Leitura pública das imagens gravadas no disco da VPS.
// Em produção o Caddy/Nginx serve o diretório direto; esta rota é o fallback
// (e o caminho usado em desenvolvimento).
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/uploads/$arquivo")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { lerUpload } = await import("@/lib/vps/uploads.server");
        const arquivo = await lerUpload(params.arquivo);
        if (!arquivo) return new Response("Imagem não encontrada.", { status: 404 });
        return new Response(new Uint8Array(arquivo.conteudo), {
          headers: {
            "content-type": arquivo.tipo,
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
