// Para onde cada perfil vai depois de entrar — lógica pura. Separa a área do
// cliente (site público + "Minhas viagens") da área da equipe (painel do admin,
// painel do motorista): quem é da equipe não passa pelo site, cai direto no painel.

export type PerfilLogado = { admin: boolean; motorista: boolean };

/** Só aceita caminho interno ("/algo"); qualquer coisa que pareça outro site
 * ("//x.com", "https://…", "javascript:…") é descartada. */
export function caminhoInternoSeguro(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  if (!caminho.startsWith("/") || caminho.startsWith("//") || caminho.includes("\\")) return null;
  return caminho;
}

/** Destino após o login/cadastro.
 *  - admin: sempre o painel (só respeita um destino salvo se for dentro do painel);
 *  - motorista (sem ser admin): o painel do motorista;
 *  - cliente: o destino salvo (ex.: o carrinho) ou "Minhas viagens". */
export function destinoPosLogin(perfil: PerfilLogado, salvo: string | null | undefined): string {
  const seguro = caminhoInternoSeguro(salvo);
  if (perfil.admin) {
    return seguro &&
      (seguro === "/admin" || seguro.startsWith("/admin?") || seguro.startsWith("/admin/"))
      ? seguro
      : "/admin";
  }
  if (perfil.motorista) {
    return seguro && (seguro === "/motorista" || seguro.startsWith("/motorista/"))
      ? seguro
      : "/motorista";
  }
  return seguro ?? "/minhas-viagens";
}
