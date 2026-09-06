// Notifica o car-fleet-co (backoffice de despacho) sobre uma reserva recém
// criada, para que ela vire um "pedido" lá, pronto pra atribuir motorista —
// ver o roteiro "Despacho Unificado", Sprint 3. Server-only.
//
// Best-effort por natureza: nunca deve travar o checkout do cliente. Se
// CARFLEET_API_URL/CARFLEET_INTEGRACAO_TOKEN não estiverem definidas (ex.:
// ambiente Lovable/Supabase, onde o car-fleet-co não está na mesma VPS), a
// notificação é pulada em silêncio — só faz sentido quando os dois apps
// rodam lado a lado.
import type { AgendamentoRow } from "@/lib/dados-tipos";

import type { sql as sqlFactory } from "./db.server";
import type { UsuarioServidor } from "./auth.server";

type SqlClient = ReturnType<typeof sqlFactory>;
type RotaResumo = { origem: string; destino: string };

export async function notificarDespacho(
  sql: SqlClient,
  agendamento: AgendamentoRow,
  usuario: UsuarioServidor,
): Promise<void> {
  const apiUrl = process.env["CARFLEET_API_URL"];
  const token = process.env["CARFLEET_INTEGRACAO_TOKEN"];
  if (!apiUrl || !token) return;

  const linhas = await sql<RotaResumo[]>`
    SELECT origem, destino FROM public.rotas WHERE id = ${agendamento.rota_id}
  `;
  const rota = linhas[0];
  if (!rota) return;

  // São Luís concentra o aeroporto/rodoviária: reserva saindo de lá = pax
  // chegando ao destino turístico (IN), reserva chegando lá = pax voltando
  // pra embarcar (OUT). Mesma convenção documentada no schema do
  // car-fleet-co (enum pedido_direcao).
  const partindoDeSaoLuis = rota.origem === "São Luís";
  const direcao = partindoDeSaoLuis ? "IN" : "OUT";
  const cidadeAtendimento = partindoDeSaoLuis ? rota.destino : rota.origem;

  const corpo = {
    codigo_reserva_canal: `dias-transporte:${agendamento.id}`,
    cidade_atendimento: cidadeAtendimento,
    data_hora_encontro: combinarDataHora(agendamento.data_viagem, agendamento.hora),
    direcao,
    passageiro_nome: agendamento.contato_nome ?? usuario.nome,
    passageiro_telefone: agendamento.contato_telefone,
    ponto_partida: agendamento.embarque_local ?? rota.origem,
    ponto_chegada: rota.destino,
    categoria_veiculo_nome: agendamento.carro === "grande" ? "Grande" : "Pequeno",
    observacoes_internas: [
      `Reserva Dias Transporte #${agendamento.id}`,
      `Trecho: ${agendamento.trecho}`,
      `Período: ${agendamento.periodo}`,
      `Passageiros: ${agendamento.passageiros}`,
      agendamento.observacoes ? `Obs.: ${agendamento.observacoes}` : null,
    ]
      .filter((linha): linha is string => Boolean(linha))
      .join(" — "),
  };

  const resposta = await fetch(`${apiUrl}/api/integracoes/dias-transporte`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-integracao-token": token },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) {
    throw new Error(`car-fleet-co respondeu ${String(resposta.status)}: ${await resposta.text()}`);
  }
}

/** agendamentos.data_viagem/hora podem ser nulos ("a combinar" no formulário
 * de reserva) ou "hora" pode não bater com HH:MM; sem uma data real não dá
 * pra despachar de verdade — usa "agora" só pra não quebrar o NOT NULL do
 * pedido, e o time de despacho ajusta manualmente com o cliente depois. */
function combinarDataHora(dataViagem: string | null, hora: string | null): string {
  if (!dataViagem) return new Date().toISOString();
  const horaFinal = hora && /^\d{2}:\d{2}/.test(hora) ? hora.slice(0, 5) : "12:00";
  // Maranhão é UTC-3 o ano todo (sem horário de verão desde 2019).
  const data = new Date(`${dataViagem}T${horaFinal}:00-03:00`);
  return Number.isNaN(data.getTime()) ? new Date().toISOString() : data.toISOString();
}
