// Onde o usuário estava tentando ir quando precisou passar por /auth (ex.: o
// carrinho, pra finalizar a reserva depois de criar conta/entrar). O carrinho
// em si (src/lib/carrinho.ts) já sobrevive sozinho no localStorage — isso
// aqui só guarda o destino da navegação pós-login.

const CHAVE_REDIRECT = "dias-transporte:pos-login-redirect";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
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
