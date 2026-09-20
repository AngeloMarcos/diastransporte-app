// Leads do formulário de contato (public.leads, migration 0017) — lógica pura,
// client-safe: validação compartilhada entre a tela e o servidor, rótulos de
// status e os links de resposta do admin.
import { z } from "zod";

import { EMPRESA } from "@/data/rotas";
import { telefoneParaWhatsapp } from "@/lib/convite";

export const LEAD_STATUS = ["novo", "contatado", "convertido", "descartado"] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const ROTULO_LEAD_STATUS: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  convertido: "Virou reserva",
  descartado: "Descartado",
};

export type LeadRow = {
  id: string;
  nome: string;
  telefone: string;
  trecho: string | null;
  data_viagem: string | null;
  observacoes: string | null;
  origem: string;
  status: LeadStatus;
  nota_interna: string | null;
  notificado_em: string | null;
  created_at: string;
};

/** Telefone digitado à mão: aceita (98) 98150-6268, +55 98 98150-6268 etc. Só
 * exige o mínimo pra dar pra ligar/responder — a checagem fina (DDD, país) é
 * do `telefoneParaWhatsapp`, usado na hora de montar o link. */
export function telefoneValido(telefone: string): boolean {
  const digitos = telefone.replace(/\D/g, "");
  return digitos.length >= 8 && digitos.length <= 15;
}

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const novoLeadSchema = z.object({
  nome: z.string().trim().min(2, "Informe o seu nome.").max(120),
  telefone: z
    .string()
    .trim()
    .max(30)
    .refine(telefoneValido, "Informe um telefone com DDD, ex.: (98) 98150-6268."),
  trecho: textoOpcional(200),
  dataViagem: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  observacoes: textoOpcional(1000),
  /** Isca anti-robô: campo escondido que gente de verdade nunca preenche. */
  website: z.string().max(200).optional(),
});

export type NovoLead = z.input<typeof novoLeadSchema>;

/** Link `tel:` — só dígitos (e "+" inicial), do jeito que o discador espera. */
export function linkTelefone(telefone: string): string {
  const bruto = telefone.trim();
  const digitos = bruto.replace(/\D/g, "");
  return `tel:${bruto.startsWith("+") ? "+" : ""}${digitos}`;
}

/** wa.me para o admin responder o cliente (não o número da empresa). null
 * quando o telefone não dá pra tratar como número brasileiro — a tela então
 * só oferece "Ligar". */
export function linkRespostaLead(lead: Pick<LeadRow, "nome" | "trecho">, telefone: string) {
  const numero = telefoneParaWhatsapp(telefone);
  if (!numero) return null;
  const primeiro = lead.nome.trim().split(/\s+/)[0] ?? "";
  const mensagem =
    `Olá${primeiro ? `, ${primeiro}` : ""}! Aqui é da ${EMPRESA.nome}. ` +
    (lead.trecho
      ? `Recebemos o seu pedido de orçamento para ${lead.trecho}. `
      : "Recebemos o seu pedido de orçamento. ") +
    "Podemos confirmar os detalhes?";
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/** Texto do aviso ao dono (webhook). Sem dados além do que o próprio cliente
 * enviou no formulário. */
export function mensagemAvisoLead(lead: {
  nome: string;
  telefone: string;
  trecho?: string | undefined;
  dataViagem?: string | undefined;
  observacoes?: string | undefined;
}): string {
  const linhas = [`Novo pedido de orçamento no site — ${lead.nome}`, `Telefone: ${lead.telefone}`];
  if (lead.trecho) linhas.push(`Trecho: ${lead.trecho}`);
  if (lead.dataViagem) linhas.push(`Data: ${lead.dataViagem}`);
  if (lead.observacoes) linhas.push(`Obs.: ${lead.observacoes}`);
  return linhas.join("\n");
}
