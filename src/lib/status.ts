// Metadados de status de agendamento compartilhados entre o painel admin e a
// área do cliente (Minhas viagens) — cor, rótulo e ordem, uma fonte só.

export const statusOpcoes = ["pendente", "confirmado", "concluido", "cancelado"] as const;
export type StatusAgendamento = (typeof statusOpcoes)[number];

export const STATUS_META: Record<
  StatusAgendamento,
  { label: string; badgeClass: string; barClass: string }
> = {
  pendente: {
    label: "Pendente",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    barClass: "bg-amber-500",
  },
  confirmado: {
    label: "Confirmado",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    barClass: "bg-blue-500",
  },
  concluido: {
    label: "Concluído",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    barClass: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    badgeClass: "border-red-500/30 bg-red-500/10 text-red-400",
    barClass: "bg-red-500",
  },
};

export function contarStatus(lista: { status: string }[]) {
  return statusOpcoes.reduce<Record<string, number>>((acc, s) => {
    acc[s] = lista.filter((a) => a.status === s).length;
    return acc;
  }, {});
}

// Status que ainda podem virar uma corrida de verdade — o resto é histórico.
// Compartilhado entre "Minhas viagens" (cliente) e o painel do motorista.
export const STATUS_ATIVOS = new Set(["pendente", "confirmado"]);

// Uma corrida só pode ser marcada como concluída pelo próprio motorista
// depois que o escritório já confirmou — evita que ele "confirme a si mesmo"
// antes da equipe validar a reserva.
export function podeConcluir(status: string): boolean {
  return status === "confirmado";
}
