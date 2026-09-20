// "Está pronto pra aparecer no site?" — lógica pura, usada pelo admin (mensagem
// amigável antes de salvar) e pelo servidor (fronteira de rede). Uma
// rota/veículo VISÍVEL sem foto é o "quadrado preto" que a auditoria do site
// achou na home e em /frota; rascunhos (ativo = false) podem estar
// incompletos, o que não pode é ir pro ar assim.

type Faltas = string[];

export function faltandoParaPublicarVeiculo(v: {
  modelo: string;
  foto: string;
  categoria: string | null | undefined;
  capacidade_passageiros: number | null | undefined;
  malas: number | null | undefined;
}): Faltas {
  const f: Faltas = [];
  if (!v.foto.trim()) f.push("foto");
  if (!v.modelo.trim()) f.push("modelo");
  if (!v.categoria) f.push("categoria (carro pequeno ou grande)");
  if (!v.capacidade_passageiros) f.push("capacidade de passageiros");
  if (v.malas === null || v.malas === undefined) f.push("número de malas");
  return f;
}

export function faltandoParaPublicarRota(r: {
  foto: string;
  resumo: string;
  preco_pequeno: number;
}): Faltas {
  const f: Faltas = [];
  if (!r.foto.trim()) f.push("foto principal");
  if (!r.resumo.trim()) f.push("resumo");
  if (!(r.preco_pequeno > 0)) f.push("preço do carro pequeno");
  return f;
}

/** Textos exibidos no site, compostos dos números (mesmo formato dos que já
 * existiam como texto livre: "Até 4 passageiros", "3 malas médias"). */
export function textoPassageiros(n: number): string {
  return `Até ${String(n)} passageiro${n === 1 ? "" : "s"}`;
}

export function textoMalas(n: number): string {
  if (n === 0) return "Sem bagagem grande";
  return `${String(n)} mala${n === 1 ? "" : "s"} média${n === 1 ? "" : "s"}`;
}

/** "Dois tipos de veículo" — o texto fixo da home passa a vir da frota real. */
export function tiposDeVeiculo(qtd: number): string {
  const nomes = ["Nenhum", "Um", "Dois", "Três", "Quatro", "Cinco"];
  const n = nomes[qtd] ?? String(qtd);
  return `${n} ${qtd === 1 ? "tipo" : "tipos"} de veículo`;
}
