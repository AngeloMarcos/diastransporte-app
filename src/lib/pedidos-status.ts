// Metadados de exibição do status de pedido (corrida do despacho) — label e
// cor, uma fonte só, no mesmo formato de src/lib/status.ts (agendamentos).
// Portado do car-fleet-co, mas com cores redesenhadas: as classes de lá
// (bg-amber-100 text-amber-900, etc.) são pra tema claro — este app é
// 100% tema escuro fixo (ver CLAUDE.md), aquelas classes ficariam lavadas
// contra o fundo escuro. Mesma paleta translúcida já usada em STATUS_META.
import type { PedidoStatus } from "@/lib/pedidos-transicoes";

export const PEDIDO_STATUS_META: Record<PedidoStatus, { label: string; badgeClass: string }> = {
  pendente_liberacao: {
    label: "Pendente liberação",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  venda_cancelada: {
    label: "Venda cancelada",
    badgeClass: "border-border bg-muted text-muted-foreground",
  },
  liberada_rede: {
    label: "Liberada para rede",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  },
  motorista_atribuido: {
    label: "Motorista atribuído",
    badgeClass: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  },
  aguardando_aceite_rede: {
    label: "Aguardando aceite",
    badgeClass: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  },
  aceita_motorista: {
    label: "Aceita pelo motorista",
    badgeClass: "border-teal-500/30 bg-teal-500/10 text-teal-400",
  },
  em_atendimento: {
    label: "Em atendimento",
    badgeClass: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  },
  corrida_finalizada: {
    label: "Finalizada",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  no_show_driver: {
    label: "No-show motorista",
    badgeClass: "border-red-500/30 bg-red-500/10 text-red-400",
  },
  no_show_pax: {
    label: "No-show passageiro",
    badgeClass: "border-red-500/30 bg-red-500/10 text-red-400",
  },
};

export const PEDIDO_STATUS_OPTIONS: PedidoStatus[] = [
  "pendente_liberacao",
  "liberada_rede",
  "motorista_atribuido",
  "aguardando_aceite_rede",
  "aceita_motorista",
  "em_atendimento",
  "corrida_finalizada",
  "no_show_driver",
  "no_show_pax",
  "venda_cancelada",
];

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
