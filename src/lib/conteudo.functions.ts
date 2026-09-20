import { createServerFn } from "@tanstack/react-start";

export type ConteudoRow = {
  id: string;
  chave: string;
  secao: string;
  titulo: string;
  texto: string;
  imagem: string;
  ordem: number;
};

/** Blocos de texto/imagem do site público (editados na aba "Conteúdo" do admin). */
export const listConteudo = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConteudoRow[]> => {
    try {
      const { vpsListConteudoPublico } = await import("@/lib/vps/dados.functions");
      return await vpsListConteudoPublico();
    } catch (erro) {
      // Banco fora do ar: as páginas têm o texto padrão de cada bloco, então é
      // melhor mostrar o site com o texto padrão do que derrubar a home com 500.
      console.error(
        JSON.stringify({
          tipo: "listConteudo_fallback_vazio",
          erro: erro instanceof Error ? erro.message : String(erro),
        }),
      );
      return [];
    }
  },
);
