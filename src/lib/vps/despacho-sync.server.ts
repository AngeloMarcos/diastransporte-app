// Cria o "pedido" de despacho correspondente a uma reserva feita pela
// vitrine. Até a fusão (roteiro em
// C:\Users\angel\.claude\plans\linear-rolling-marble.md, Etapa 6) isto era
// uma chamada HTTP pro car-fleet-co — dois apps separados na mesma VPS,
// falando por um webhook com token fixo (integracao-carfleet.server.ts,
// Sprint 3 do roteiro "Despacho Unificado"). Achado revisando o que sobrou
// da fusão: aquele arquivo nunca tinha sido substituído de verdade — ainda
// fazia fetch() pra uma URL que não existe mais neste app único, e como
// CARFLEET_API_URL fica vazia aqui, a notificação sempre virava no-op
// silencioso. Ou seja: nenhuma reserva da vitrine estava virando pedido no
// despacho. Este arquivo substitui aquele: mesmo mapeamento (direção,
// cidade de atendimento, categoria), mas como insert direto na mesma base
// — sem salto de rede, sem token, sem endpoint pra manter.
//
// Best-effort por natureza: nunca deve travar nem reverter o checkout do
// cliente — por isso o call site (vpsCriarReservas) chama isto fora da
// transação da reserva e sem esperar o resultado.
import type { AgendamentoRow } from "@/lib/dados-tipos";

import type { sql as sqlFactory } from "./db.server";
import type { UsuarioServidor } from "./auth.server";

type SqlClient = ReturnType<typeof sqlFactory>;
type RotaResumo = { origem: string; destino: string };
type CategoriaNome = "Pequeno" | "Grande";

// Só usada a primeira vez que a categoria é criada (upsert por nome); em
// atualizações seguintes o valor já cadastrado no admin prevalece — mesma
// regra que já valia no endpoint do car-fleet-co.
const CAPACIDADE_PADRAO: Record<CategoriaNome, number> = { Pequeno: 4, Grande: 8 };

export async function criarPedidoDespacho(
  sql: SqlClient,
  agendamento: AgendamentoRow,
  usuario: UsuarioServidor,
): Promise<void> {
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
  const categoriaNome: CategoriaNome = agendamento.carro === "grande" ? "Grande" : "Pequeno";
  // Chave de idempotência: reenvios (ex.: uma segunda chamada acidental)
  // não duplicam o pedido — ON CONFLICT DO NOTHING abaixo.
  const codigoReservaCanal = `dias-transporte:${agendamento.id}`;
  const observacoesInternas = [
    `Reserva Dias Transporte #${agendamento.id}`,
    `Trecho: ${agendamento.trecho}`,
    `Período: ${agendamento.periodo}`,
    `Passageiros: ${agendamento.passageiros}`,
    agendamento.observacoes ? `Obs.: ${agendamento.observacoes}` : null,
  ]
    .filter((linha): linha is string => Boolean(linha))
    .join(" — ");

  // Canal de venda e categoria de veículo são auto-cadastrados no primeiro
  // pedido que os referencia — não exige um passo de seed manual.
  const [canal] = await sql<{ id: string }[]>`
    INSERT INTO public.canais_venda (nome, tipo)
    VALUES ('Dias Transporte', 'site_proprio')
    ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;
  const [categoria] = await sql<{ id: string }[]>`
    INSERT INTO public.categorias_veiculo (nome, capacidade_passageiros)
    VALUES (${categoriaNome}, ${CAPACIDADE_PADRAO[categoriaNome]})
    ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  `;
  if (!canal || !categoria) return;

  await sql.begin(async (tx) => {
    // ON CONFLICT DO NOTHING em vez de "SELECT existe? depois insere":
    // evita corrida entre uma checagem e um insert se a função for chamada
    // duas vezes quase ao mesmo tempo pra mesma reserva.
    const [criado] = await tx<{ id: number }[]>`
      INSERT INTO public.pedidos
        (codigo_reserva_canal, canal_venda_id, cidade_atendimento, data_hora_encontro,
         direcao, passageiro_nome, passageiro_telefone, ponto_partida, ponto_chegada,
         categoria_veiculo_id)
      VALUES (${codigoReservaCanal}, ${canal.id}, ${cidadeAtendimento},
              ${combinarDataHora(agendamento.data_viagem, agendamento.hora)}, ${direcao},
              ${agendamento.contato_nome ?? usuario.nome}, ${agendamento.contato_telefone},
              ${agendamento.embarque_local ?? rota.origem}, ${rota.destino}, ${categoria.id})
      ON CONFLICT (codigo_reserva_canal) WHERE codigo_reserva_canal IS NOT NULL AND codigo_reserva_canal <> ''
      DO NOTHING
      RETURNING id
    `;
    if (!criado) return; // já existe — nada a fazer
    await tx`
      INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo)
      VALUES (${criado.id}, NULL, 'pendente_liberacao')
    `;
    if (observacoesInternas) {
      await tx`
        INSERT INTO public.pedidos_notas_internas (pedido_id, observacoes_internas)
        VALUES (${criado.id}, ${observacoesInternas})
      `;
    }
  });
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
