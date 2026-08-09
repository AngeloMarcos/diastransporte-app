import type { Rota } from "@/data/rotas";

export type RotaRow = {
  id: string;
  slug: string;
  origem: string;
  destino: string;
  ida_e_volta: boolean;
  duracao: string;
  distancia: string;
  preco_pequeno: number;
  preco_grande: number | null;
  preco_pequeno_noite: number | null;
  preco_grande_noite: number | null;
  destaque: string | null;
  popularidade: number;
  resumo: string;
  descricao: string;
  embarque: string[];
  foto: string;
  galeria: string[];
  ativo: boolean;
};

export const ROTA_COLUMNS =
  "id,slug,origem,destino,ida_e_volta,duracao,distancia,preco_pequeno,preco_grande,preco_pequeno_noite,preco_grande_noite,destaque,popularidade,resumo,descricao,embarque,foto,galeria,ativo";

export function rowToRota(row: RotaRow): Rota {
  return {
    id: row.id,
    slug: row.slug,
    origem: row.origem,
    destino: row.destino,
    ida_e_volta: row.ida_e_volta,
    duracao: row.duracao,
    distancia: row.distancia,
    precoPequeno: row.preco_pequeno,
    precoGrande: row.preco_grande,
    ...(row.preco_pequeno_noite !== null ? { precoPequenoNoite: row.preco_pequeno_noite } : {}),
    ...(row.preco_grande_noite !== null ? { precoGrandeNoite: row.preco_grande_noite } : {}),
    ...(row.destaque ? { destaque: row.destaque } : {}),
    popularidade: row.popularidade,
    resumo: row.resumo,
    descricao: row.descricao,
    embarque: row.embarque ?? [],
    foto: row.foto,
    galeria: row.galeria?.length ? row.galeria : [row.foto],
  };
}
