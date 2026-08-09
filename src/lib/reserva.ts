// Guarda o que o usuário estava reservando quando precisou sair para criar
// conta ou entrar, para que ele volte exatamente de onde parou.

export type RascunhoReserva = {
  slug: string;
  origem: string;
  destino: string;
  data: string;
  hora: string;
  periodo: "dia" | "noite";
  carro: "pequeno" | "grande";
  passageiros: number;
  embarqueLocal: string;
  observacoes: string;
};

const CHAVE_RASCUNHO = "dias-transporte:rascunho-reserva";
const CHAVE_REDIRECT = "dias-transporte:pos-login-redirect";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function salvarRascunho(rascunho: RascunhoReserva) {
  storage()?.setItem(CHAVE_RASCUNHO, JSON.stringify(rascunho));
}

export function lerRascunho(slug?: string): RascunhoReserva | null {
  try {
    const bruto = storage()?.getItem(CHAVE_RASCUNHO);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as RascunhoReserva;
    if (slug && dados.slug !== slug) return null;
    return dados;
  } catch {
    return null;
  }
}

export function limparRascunho() {
  storage()?.removeItem(CHAVE_RASCUNHO);
}

export function salvarRedirectPosLogin(caminho: string) {
  storage()?.setItem(CHAVE_REDIRECT, caminho);
}

export function consumirRedirectPosLogin(): string | null {
  const s = storage();
  const caminho = s?.getItem(CHAVE_REDIRECT) ?? null;
  if (caminho) s?.removeItem(CHAVE_REDIRECT);
  return caminho;
}
