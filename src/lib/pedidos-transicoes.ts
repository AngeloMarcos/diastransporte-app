// Máquina de estado dos pedidos — lógica pura, sem dependência de backend.
// Extraída de src/lib/pedidos.tsx pra ser compartilhada entre o ramo Supabase
// (onde a validação "de verdade" mora em fn_transicionar_status, SQL,
// SECURITY DEFINER) e o ramo VPS (onde não há RLS nem funções de banco pra
// regra de negócio — isto aqui É a validação, chamada direto do server
// function em src/lib/vps/dados.functions.ts). Mesma tabela de transições
// nos dois casos, uma fonte só.
export type PedidoStatus =
  | "pendente_liberacao"
  | "venda_cancelada"
  | "liberada_rede"
  | "motorista_atribuido"
  | "aguardando_aceite_rede"
  | "aceita_motorista"
  | "em_atendimento"
  | "corrida_finalizada"
  | "no_show_driver"
  | "no_show_pax";

export type PedidoDirecao = "IN" | "OUT";

/** Retorna transições permitidas a partir do status atual, dado o papel. */
export function transicoesPermitidas(
  atual: PedidoStatus,
  role: "admin" | "motorista",
): PedidoStatus[] {
  const out: PedidoStatus[] = [];
  const isAdmin = role === "admin";
  if (isAdmin && !["corrida_finalizada", "no_show_driver", "no_show_pax"].includes(atual))
    out.push("venda_cancelada");
  if (isAdmin && atual === "pendente_liberacao") out.push("liberada_rede");
  if (isAdmin && atual === "liberada_rede") out.push("motorista_atribuido", "aguardando_aceite_rede");
  if (["motorista_atribuido", "aguardando_aceite_rede"].includes(atual)) out.push("aceita_motorista");
  if (atual === "aceita_motorista") out.push("em_atendimento");
  if (atual === "em_atendimento") out.push("corrida_finalizada", "no_show_driver", "no_show_pax");
  return out;
}

/** true se a transição atual -> novo é permitida para o papel informado. */
export function transicaoValida(
  atual: PedidoStatus,
  novo: PedidoStatus,
  role: "admin" | "motorista",
): boolean {
  return transicoesPermitidas(atual, role).includes(novo);
}
