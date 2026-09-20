// Otimização de fotos antes do envio (rotas, frota, galeria, conteúdo do site).
// Foto de celular chega com 4–12 MB e milhares de pixels de largura; no site
// isso vira carregamento lento no 4G do turista. Aqui a foto é redimensionada
// e regravada em WebP no navegador do admin, antes de subir — vale igual para
// o Lovable Cloud e para a VPS, sem depender de biblioteca nativa no servidor.
// Regravar pelo canvas também descarta os metadados EXIF (inclusive a
// localização GPS da foto) e já aplica a rotação correta.

/** Maior lado, em pixels. 1920 cobre o hero em tela cheia sem desperdício. */
export const IMAGEM_LADO_MAX = 1920;
const QUALIDADE_WEBP = 0.82;

/** Formatos que vale a pena regravar. SVG/GIF ficam como estão (vetor e
 * animação se perderiam) e AVIF já é eficiente. */
const TIPOS_OTIMIZAVEIS = ["image/jpeg", "image/png", "image/webp"];

export function tipoOtimizavel(tipo: string): boolean {
  return TIPOS_OTIMIZAVEIS.includes(tipo.toLowerCase());
}

/** Tamanho final mantendo a proporção; nunca amplia uma foto pequena. */
export function dimensoesAlvo(
  largura: number,
  altura: number,
  ladoMax: number = IMAGEM_LADO_MAX,
): { largura: number; altura: number } {
  const maior = Math.max(largura, altura);
  if (maior <= ladoMax) return { largura, altura };
  const fator = ladoMax / maior;
  return {
    largura: Math.max(1, Math.round(largura * fator)),
    altura: Math.max(1, Math.round(altura * fator)),
  };
}

/** "minha foto (1).JPG" → "minha_foto_1.webp": só letras, números, ponto, hífen
 * e sublinhado, pra caber em qualquer caminho de storage. */
export function nomeWebp(nomeOriginal: string): string {
  const base = nomeOriginal.replace(/\.[^.]+$/, "");
  const limpo = base
    .replace(/[^\w-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${limpo || "foto"}.webp`;
}

/** Devolve a foto otimizada em WebP, ou o arquivo original quando não há ganho
 * (formato não otimizável, navegador sem suporte, foto já pequena e leve) ou
 * algo falha — enviar a foto original é sempre melhor que travar o upload. */
export async function otimizarImagem(arquivo: File): Promise<File> {
  if (!tipoOtimizavel(arquivo.type)) return arquivo;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return arquivo;
  try {
    // "from-image": respeita a orientação EXIF antes de o metadado ser descartado.
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const { largura, altura } = dimensoesAlvo(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return arquivo;
    }
    ctx.drawImage(bitmap, 0, 0, largura, altura);
    const redimensionou = largura !== bitmap.width || altura !== bitmap.height;
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALIDADE_WEBP),
    );
    // Sem WebP no navegador o canvas devolve PNG (maior); sem ganho, mantém o original.
    if (!blob || blob.type !== "image/webp") return arquivo;
    if (!redimensionou && blob.size >= arquivo.size) return arquivo;
    return new File([blob], nomeWebp(arquivo.name), { type: "image/webp" });
  } catch {
    return arquivo;
  }
}
