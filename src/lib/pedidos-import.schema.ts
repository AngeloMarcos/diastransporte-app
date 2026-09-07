import { z } from "zod";

export const pedidoImportRowSchema = z.object({
  codigo_reserva_canal: z.string().trim().max(80).nullable().default(null),
  codigo_fornecedor_reserva: z.string().trim().max(80).nullable().default(null),
  passageiro_nome: z.string().trim().min(2).max(200),
  passageiro_telefone: z.string().trim().max(120).nullable().default(null),
  cidade_atendimento: z.string().trim().min(2).max(120),
  hotel: z.string().trim().max(200).nullable().default(null),
  data_hora_encontro: z.string().datetime(),
  direcao: z.enum(["IN", "OUT"]),
  numero_voo: z.string().trim().max(30).nullable().default(null),
  ponto_partida: z.string().trim().max(300).nullable().default(null),
  ponto_chegada: z.string().trim().max(300).nullable().default(null),
  canal_venda_id: z.string().uuid().nullable().default(null),
  categoria_veiculo_id: z.string().uuid().nullable().default(null),
  empresa_cliente_id: z.string().uuid().nullable().default(null),
});

export const pedidosImportSchema = z.object({
  rows: z.array(pedidoImportRowSchema).min(1).max(2000),
});

export type PedidoImportRow = z.infer<typeof pedidoImportRowSchema>;