// Camada de dados do despacho (pedidos/corridas, categorias de veículo,
// empresas clientes, canais de venda) — portada do car-fleet-co como parte
// da fusão (ver roteiro em C:\Users\angel\.claude\plans\linear-rolling-marble.md,
// Etapa 6). Arquivo separado de vps/dados.functions.ts (que já é grande)
// pra manter o domínio do despacho isolado. Mesmo padrão de autorização do
// resto do app: sem RLS nessas tabelas, então toda checagem é feita aqui em
// TypeScript, não no banco. Só é chamado quando VITE_AUTH_MODE=vps — este
// domínio inteiro é VPS-only por enquanto (ver comentário em dados.ts).
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { limitesDoDiaEmMaranhao } from "@/lib/fuso-maranhao";
import { transicaoValida, type PedidoStatus } from "@/lib/pedidos-transicoes";

async function contexto() {
  const [{ lerCookieSessao, exigirUsuario, exigirAdmin, exigirMotorista }, { sql }] =
    await Promise.all([import("./auth.server"), import("./db.server")]);
  const token = lerCookieSessao(getRequestHeader("cookie") ?? null);
  return {
    sql: sql(),
    usuario: () => exigirUsuario(token),
    admin: () => exigirAdmin(token),
    motorista: () => exigirMotorista(token),
  };
}

// ------------------------------------------------------------------ pedidos
const filtroPedidos = z.object({
  codigo: z.string().optional(),
  canal: z.string().uuid().optional(),
  status: z.string().optional(),
  empresa: z.string().uuid().optional(),
  fornecedor: z.string().optional(), // uuid, ou "none"
  direcao: z.enum(["IN", "OUT"]).optional(),
  passageiro: z.string().optional(),
  cidade: z.string().optional(),
  tipoData: z.enum(["atividade", "emissao", "alteracao"]).optional(),
  de: z.string().optional(),
  ate: z.string().optional(),
});
type FiltroPedidos = z.infer<typeof filtroPedidos>;

function colunaData(tipo: FiltroPedidos["tipoData"]) {
  if (tipo === "emissao") return "data_emissao";
  if (tipo === "alteracao") return "data_alteracao";
  return "data_hora_encontro";
}

// Tipagem explícita das linhas — sem isto, o spread `{...r, campo: ...}`
// numa linha sem tipo (Row do postgres.js é só um index signature) faz o
// TypeScript inferir de volta só os campos citados explicitamente,
// perdendo os demais no retorno da função (achado revisando o typecheck:
// o admin.tsx via um objeto sem passageiro_nome/status/etc.).
type PedidoListaRow = {
  id: number;
  codigo_reserva_canal: string | null;
  empresa_cliente_id: string | null;
  canal_venda_id: string | null;
  cidade_atendimento: string;
  hotel: string | null;
  data_hora_encontro: string;
  data_emissao: string;
  data_alteracao: string;
  direcao: "IN" | "OUT";
  passageiro_nome: string;
  fornecedor_id: string | null;
  status: string;
  empresa_nome_join: string | null;
  canal_nome: string | null;
  fornecedor_nome: string | null;
};

// Painel resumido do despacho (status/hoje/sem motorista) — existia como a
// própria home do admin no car-fleet-co original (`/admin`, dashboard.tsx);
// aqui vira uma seção a mais dentro da aba "Visão geral" já existente do
// host, em vez de uma rota própria — mesmo dado, um lugar só. Ficou de fora
// da Etapa 7 por engano (portei a lógica de listar/importar/atribuir, mas
// não essa) — usuário notou faltar ao comparar com o painel original.
export const vpsDashboardDespacho = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    porStatus: Record<string, number>;
    hoje: {
      id: number;
      passageiro_nome: string;
      cidade_atendimento: string;
      data_hora_encontro: string;
      status: string;
      direcao: "IN" | "OUT";
    }[];
    semMotorista: {
      id: number;
      passageiro_nome: string;
      cidade_atendimento: string;
      data_hora_encontro: string;
      status: string;
    }[];
  }> => {
    const ctx = await contexto();
    await ctx.admin();

    const porStatusLinhas = await ctx.sql<{ status: PedidoStatus; total: string }[]>`
      SELECT status, count(*)::text AS total FROM public.pedidos GROUP BY status
    `;
    const porStatus: Record<string, number> = {};
    for (const l of porStatusLinhas) porStatus[l.status] = Number(l.total);

    // Achado revisando performance/correção: setHours(0,0,0,0) usa o fuso do
    // PROCESSO Node, não o de Maranhão (UTC-3 fixo) — num container rodando
    // em UTC (padrão comum), "hoje" ficava até 3h errado perto da meia-noite.
    const { inicio: inicioHoje, fim: fimHoje } = limitesDoDiaEmMaranhao();

    const hoje = await ctx.sql<
      {
        id: number;
        passageiro_nome: string;
        cidade_atendimento: string;
        data_hora_encontro: string;
        status: string;
        direcao: "IN" | "OUT";
      }[]
    >`
      SELECT id, passageiro_nome, cidade_atendimento, data_hora_encontro, status, direcao
        FROM public.pedidos
       WHERE data_hora_encontro BETWEEN ${inicioHoje} AND ${fimHoje}
       ORDER BY data_hora_encontro
    `;
    const semMotorista = await ctx.sql<
      {
        id: number;
        passageiro_nome: string;
        cidade_atendimento: string;
        data_hora_encontro: string;
        status: string;
      }[]
    >`
      SELECT id, passageiro_nome, cidade_atendimento, data_hora_encontro, status
        FROM public.pedidos
       WHERE fornecedor_id IS NULL AND status <> 'venda_cancelada'
       ORDER BY data_hora_encontro DESC
       LIMIT 20
    `;
    return { porStatus, hoje: [...hoje], semMotorista: [...semMotorista] };
  },
);

export const vpsListarPedidosAdmin = createServerFn({ method: "GET" })
  .inputValidator((data) => filtroPedidos.parse(data ?? {}))
  .handler(async ({ data: f }) => {
    const ctx = await contexto();
    await ctx.admin();
    const sql = ctx.sql;

    let cond = sql`TRUE`;
    if (f.codigo) cond = sql`${cond} AND p.codigo_reserva_canal ILIKE ${"%" + f.codigo + "%"}`;
    if (f.canal) cond = sql`${cond} AND p.canal_venda_id = ${f.canal}`;
    if (f.status) cond = sql`${cond} AND p.status = ${f.status}`;
    if (f.empresa) cond = sql`${cond} AND p.empresa_cliente_id = ${f.empresa}`;
    if (f.fornecedor === "none") cond = sql`${cond} AND p.fornecedor_id IS NULL`;
    else if (f.fornecedor) cond = sql`${cond} AND p.fornecedor_id = ${f.fornecedor}`;
    if (f.direcao) cond = sql`${cond} AND p.direcao = ${f.direcao}`;
    if (f.passageiro) cond = sql`${cond} AND p.passageiro_nome ILIKE ${"%" + f.passageiro + "%"}`;
    if (f.cidade) cond = sql`${cond} AND p.cidade_atendimento ILIKE ${"%" + f.cidade + "%"}`;
    const coluna = colunaData(f.tipoData);
    if (f.de) cond = sql`${cond} AND ${sql(coluna)} >= ${new Date(f.de).toISOString()}`;
    if (f.ate) {
      const fim = new Date(f.ate);
      fim.setHours(23, 59, 59, 999);
      cond = sql`${cond} AND ${sql(coluna)} <= ${fim.toISOString()}`;
    }

    const linhas = await sql<PedidoListaRow[]>`
      SELECT p.id, p.codigo_reserva_canal, p.empresa_cliente_id, p.canal_venda_id, p.cidade_atendimento,
             p.hotel, p.data_hora_encontro, p.data_emissao, p.data_alteracao, p.direcao,
             p.passageiro_nome, p.fornecedor_id, p.status,
             e.nome AS empresa_nome_join, c.nome AS canal_nome, f.nome AS fornecedor_nome
        FROM public.pedidos p
        LEFT JOIN public.empresas_clientes e ON e.id = p.empresa_cliente_id
        LEFT JOIN public.canais_venda c ON c.id = p.canal_venda_id
        LEFT JOIN public.fornecedores f ON f.id = p.fornecedor_id
       WHERE ${cond}
       ORDER BY p.data_hora_encontro DESC
       LIMIT 500
    `;
    return linhas.map((r) => ({
      ...r,
      empresa_nome: r.empresa_nome_join,
    }));
  });

type PedidoDetalheRow = PedidoListaRow & {
  codigo_fornecedor_reserva: string | null;
  passageiro_telefone: string | null;
  ponto_partida: string | null;
  ponto_chegada: string | null;
  numero_voo: string | null;
  categoria_veiculo_id: string | null;
  observacao_motorista: string | null;
  categoria_nome: string | null;
  fornecedor_id_join: string | null;
};

export const vpsPedidoDetalheAdmin = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.number().int() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    const linhas = await ctx.sql<PedidoDetalheRow[]>`
      SELECT p.*, e.nome AS empresa_nome_join, c.nome AS canal_nome, cat.nome AS categoria_nome,
             f.id AS fornecedor_id_join, f.nome AS fornecedor_nome
        FROM public.pedidos p
        LEFT JOIN public.empresas_clientes e ON e.id = p.empresa_cliente_id
        LEFT JOIN public.canais_venda c ON c.id = p.canal_venda_id
        LEFT JOIN public.categorias_veiculo cat ON cat.id = p.categoria_veiculo_id
        LEFT JOIN public.fornecedores f ON f.id = p.fornecedor_id
       WHERE p.id = ${data.id}
    `;
    const p = linhas[0];
    if (!p) return null;

    const [nota] = await ctx.sql<{ observacoes_internas: string | null }[]>`
      SELECT observacoes_internas FROM public.pedidos_notas_internas WHERE pedido_id = ${data.id}
    `;
    const historico = await ctx.sql<
      { id: string; status_anterior: string | null; status_novo: string; created_at: string }[]
    >`
      SELECT id, status_anterior, status_novo, alterado_em AS created_at
        FROM public.pedidos_historico WHERE pedido_id = ${data.id} ORDER BY alterado_em DESC
    `;

    return {
      ...p,
      empresa_nome: p.empresa_nome_join,
      observacoes_internas: nota?.observacoes_internas ?? "",
      historico: [...historico],
    };
  });

const novoPedidoSchema = z.object({
  codigo_reserva_canal: z.string().nullable().default(null),
  empresa_cliente_id: z.string().uuid().nullable().default(null),
  canal_venda_id: z.string().uuid().nullable().default(null),
  cidade_atendimento: z.string().min(2),
  hotel: z.string().nullable().default(null),
  data_hora_encontro: z.string(),
  direcao: z.enum(["IN", "OUT"]),
  passageiro_nome: z.string().min(2),
  passageiro_telefone: z.string().nullable().default(null),
  ponto_partida: z.string().nullable().default(null),
  ponto_chegada: z.string().nullable().default(null),
  numero_voo: z.string().nullable().default(null),
  categoria_veiculo_id: z.string().uuid().nullable().default(null),
  observacoes_internas: z.string().optional().default(""),
});

export const vpsCriarPedido = createServerFn({ method: "POST" })
  .inputValidator((data) => novoPedidoSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    return ctx.sql.begin(async (sql) => {
      const [pedido] = await sql<{ id: number }[]>`
        INSERT INTO public.pedidos
          (codigo_reserva_canal, empresa_cliente_id, canal_venda_id, cidade_atendimento, hotel,
           data_hora_encontro, direcao, passageiro_nome, passageiro_telefone, ponto_partida,
           ponto_chegada, numero_voo, categoria_veiculo_id)
        VALUES (${data.codigo_reserva_canal}, ${data.empresa_cliente_id}, ${data.canal_venda_id},
                ${data.cidade_atendimento}, ${data.hotel}, ${data.data_hora_encontro}, ${data.direcao},
                ${data.passageiro_nome}, ${data.passageiro_telefone}, ${data.ponto_partida},
                ${data.ponto_chegada}, ${data.numero_voo}, ${data.categoria_veiculo_id})
        RETURNING id
      `;
      if (!pedido) throw new Error("Não foi possível criar o pedido.");
      await sql`
        INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo)
        VALUES (${pedido.id}, NULL, 'pendente_liberacao')
      `;
      if (data.observacoes_internas.trim()) {
        await sql`
          INSERT INTO public.pedidos_notas_internas (pedido_id, observacoes_internas)
          VALUES (${pedido.id}, ${data.observacoes_internas.trim()})
        `;
      }
      return pedido;
    });
  });

// Só o lado admin por enquanto — o painel próprio do motorista (que também
// usa transicaoValida, com role="motorista") é o car-fleet-co
// "/motorista/*", ainda não portado (ver Etapa 9 do roteiro da fusão: fica
// pra depois de resolver a colisão com o /motorista atual, baseado em
// agendamentos.motorista_id).
export const vpsTransicionarStatusPedido = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ pedidoId: z.number().int(), novoStatus: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const usuario = await ctx.admin();

    return ctx.sql.begin(async (sql) => {
      const [pedido] = await sql<{ id: number; status: PedidoStatus }[]>`
        SELECT id, status FROM public.pedidos WHERE id = ${data.pedidoId} FOR UPDATE
      `;
      if (!pedido) throw new Error(`Corrida ${String(data.pedidoId)} não encontrada.`);

      if (!transicaoValida(pedido.status, data.novoStatus as PedidoStatus, "admin")) {
        throw new Error(`Transição inválida: ${pedido.status} → ${data.novoStatus}`);
      }

      const [atualizado] = await sql`
        UPDATE public.pedidos SET status = ${data.novoStatus} WHERE id = ${data.pedidoId} RETURNING *
      `;
      await sql`
        INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo, alterado_por)
        VALUES (${data.pedidoId}, ${pedido.status}, ${data.novoStatus}, ${usuario.id})
      `;
      return atualizado;
    });
  });

export const vpsAtribuirMotoristaPedido = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({ pedidoId: z.number().int(), fornecedorId: z.string().uuid().nullable() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const admin = await ctx.admin();

    return ctx.sql.begin(async (sql) => {
      const [antes] = await sql<{ status: PedidoStatus }[]>`
        SELECT status FROM public.pedidos WHERE id = ${data.pedidoId} FOR UPDATE
      `;
      if (!antes) throw new Error(`Corrida ${String(data.pedidoId)} não encontrada.`);

      // Achado revisando autorização: sem esta checagem, dava pra atribuir
      // um fornecedor desativado (ex.: removido via vpsRemoverMotorista,
      // que zera user_id e mantém a linha) — a corrida ficava presa, sem
      // ninguém conseguindo acessá-la, já que fornecedorDoMotorista só acha
      // fornecedor pelo user_id de quem está logado.
      if (data.fornecedorId) {
        const [fornecedor] = await sql<{ id: string }[]>`
          SELECT id FROM public.fornecedores WHERE id = ${data.fornecedorId} AND ativo
        `;
        if (!fornecedor) throw new Error("Motorista não encontrado ou está desativado.");
      }

      // Atribuir um motorista avança automaticamente o status pra
      // "motorista_atribuido" quando ele ainda estava só liberado — mas não
      // mexe no status se a corrida já foi além disso (ex.: trocar o
      // motorista de uma corrida já aceita não deveria voltar o status).
      const novoStatus: PedidoStatus =
        data.fornecedorId &&
        (
          ["pendente_liberacao", "liberada_rede", "aguardando_aceite_rede"] as PedidoStatus[]
        ).includes(antes.status)
          ? "motorista_atribuido"
          : antes.status;

      const [pedido] = await sql`
        UPDATE public.pedidos SET fornecedor_id = ${data.fornecedorId}, status = ${novoStatus}
         WHERE id = ${data.pedidoId}
         RETURNING *
      `;
      if (novoStatus !== antes.status) {
        await sql`
          INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo, alterado_por)
          VALUES (${data.pedidoId}, ${antes.status}, ${novoStatus}, ${admin.id})
        `;
      }
      return pedido;
    });
  });

// --------------------------------------------------- painel do motorista
// Etapa 9 do roteiro da fusão: o modelo novo de motorista (fornecedores +
// pedidos.fornecedor_id) tinha corridas atribuíveis desde a Etapa 6, mas o
// próprio motorista não tinha nenhuma tela pra ver/agir sobre elas — só o
// admin enxergava. Checagem de pré-condição feita direto no banco de
// produção antes de escrever isto: zero agendamentos com motorista_id
// pendente/confirmado, zero usuarios.motorista=true — o modelo antigo
// (agendamentos.motorista_id, rota /motorista) nunca teve uso real, então
// dá pra substituir com segurança em vez de manter os dois em paralelo.
async function fornecedorDoMotorista(
  ctx: Awaited<ReturnType<typeof contexto>>,
  userId: string,
): Promise<string> {
  const linhas = await ctx.sql<{ id: string }[]>`
    SELECT id FROM public.fornecedores WHERE user_id = ${userId} LIMIT 1
  `;
  const id = linhas[0]?.id;
  if (!id) throw new Error("Nenhum cadastro de motorista vinculado a este usuário.");
  return id;
}

export const vpsMeuFornecedor = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    id: string;
    nome: string;
    telefone: string | null;
    cidade_atuacao: string;
    email: string;
  } | null> => {
    const ctx = await contexto();
    const usuario = await ctx.motorista();
    const linhas = await ctx.sql<
      { id: string; nome: string; telefone: string | null; cidade_atuacao: string }[]
    >`
      SELECT id, nome, telefone, cidade_atuacao FROM public.fornecedores WHERE user_id = ${usuario.id}
    `;
    const fornecedor = linhas[0];
    if (!fornecedor) return null;
    return { ...fornecedor, email: usuario.email };
  },
);

type PedidoMotoristaRow = {
  id: number;
  cidade_atendimento: string;
  hotel: string | null;
  data_hora_encontro: string;
  direcao: "IN" | "OUT";
  passageiro_nome: string;
  passageiro_telefone: string | null;
  ponto_partida: string | null;
  ponto_chegada: string | null;
  numero_voo: string | null;
  status: string;
  observacao_motorista: string | null;
};

export const vpsListarPedidosMotorista = createServerFn({ method: "GET" }).handler(
  async (): Promise<PedidoMotoristaRow[]> => {
    const ctx = await contexto();
    const usuario = await ctx.motorista();
    const fornecedorId = await fornecedorDoMotorista(ctx, usuario.id);
    return ctx.sql<PedidoMotoristaRow[]>`
      SELECT id, cidade_atendimento, hotel, data_hora_encontro, direcao, passageiro_nome,
             passageiro_telefone, ponto_partida, ponto_chegada, numero_voo, status,
             observacao_motorista
        FROM public.pedidos
       WHERE fornecedor_id = ${fornecedorId}
       ORDER BY data_hora_encontro DESC
    `.then((linhas) => [...linhas]);
  },
);

export const vpsTransicionarStatusPedidoMotorista = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ pedidoId: z.number().int(), novoStatus: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const usuario = await ctx.motorista();
    const fornecedorId = await fornecedorDoMotorista(ctx, usuario.id);

    return ctx.sql.begin(async (sql) => {
      const [pedido] = await sql<
        { id: number; status: PedidoStatus; fornecedor_id: string | null }[]
      >`
        SELECT id, status, fornecedor_id FROM public.pedidos WHERE id = ${data.pedidoId} FOR UPDATE
      `;
      if (!pedido) throw new Error(`Corrida ${String(data.pedidoId)} não encontrada.`);
      if (pedido.fornecedor_id !== fornecedorId) {
        throw new Error("Esta corrida não está atribuída a você.");
      }
      if (!transicaoValida(pedido.status, data.novoStatus as PedidoStatus, "motorista")) {
        throw new Error(`Transição inválida: ${pedido.status} → ${data.novoStatus}`);
      }

      const [atualizado] = await sql`
        UPDATE public.pedidos SET status = ${data.novoStatus} WHERE id = ${data.pedidoId} RETURNING *
      `;
      await sql`
        INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo, alterado_por)
        VALUES (${data.pedidoId}, ${pedido.status}, ${data.novoStatus}, ${usuario.id})
      `;
      return atualizado;
    });
  });

export const vpsSalvarObservacaoMotorista = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ pedidoId: z.number().int(), texto: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const usuario = await ctx.motorista();
    const fornecedorId = await fornecedorDoMotorista(ctx, usuario.id);
    const linhas = await ctx.sql<{ id: number }[]>`
      UPDATE public.pedidos SET observacao_motorista = ${data.texto}
       WHERE id = ${data.pedidoId} AND fornecedor_id = ${fornecedorId}
       RETURNING id
    `;
    if (!linhas[0]) throw new Error("Corrida não encontrada ou não atribuída a você.");
    return { ok: true };
  });

export const vpsSalvarNotasInternas = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ pedidoId: z.number().int(), texto: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      INSERT INTO public.pedidos_notas_internas (pedido_id, observacoes_internas)
      VALUES (${data.pedidoId}, ${data.texto})
      ON CONFLICT (pedido_id) DO UPDATE SET observacoes_internas = ${data.texto}, updated_at = now()
    `;
    return { ok: true };
  });

// ---------------------------------------------------- cadastros de apoio
type CategoriaRow = {
  id: string;
  nome: string;
  capacidade_passageiros: number | null;
  ativo: boolean;
};

export const vpsListarCategoriasVeiculo = createServerFn({ method: "GET" }).handler(
  async (): Promise<CategoriaRow[]> => {
    const ctx = await contexto();
    await ctx.usuario();
    return ctx.sql<CategoriaRow[]>`
      SELECT id, nome, capacidade_passageiros, ativo FROM public.categorias_veiculo ORDER BY nome
    `.then((r) => [...r]);
  },
);

const categoriaSchema = z.object({
  nome: z.string().min(1),
  capacidade_passageiros: z.number().int().positive().nullable(),
});

export const vpsCriarCategoriaVeiculo = createServerFn({ method: "POST" })
  .inputValidator((data) => categoriaSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      INSERT INTO public.categorias_veiculo (nome, capacidade_passageiros)
      VALUES (${data.nome}, ${data.capacidade_passageiros})
    `;
    return { ok: true };
  });

export const vpsAtualizarCategoriaVeiculo = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    categoriaSchema.extend({ id: z.string().uuid(), ativo: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    if (data.ativo !== undefined) {
      await ctx.sql`UPDATE public.categorias_veiculo SET ativo = ${data.ativo} WHERE id = ${data.id}`;
    } else {
      await ctx.sql`
        UPDATE public.categorias_veiculo
           SET nome = ${data.nome}, capacidade_passageiros = ${data.capacidade_passageiros}
         WHERE id = ${data.id}
      `;
    }
    return { ok: true };
  });

type EmpresaRow = {
  id: string;
  nome: string;
  documento: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
  ativo: boolean;
};

export const vpsListarEmpresasClientes = createServerFn({ method: "GET" }).handler(
  async (): Promise<EmpresaRow[]> => {
    const ctx = await contexto();
    await ctx.usuario();
    return ctx.sql<EmpresaRow[]>`
      SELECT id, nome, documento, email_contato, telefone_contato, ativo FROM public.empresas_clientes
       ORDER BY nome
    `.then((r) => [...r]);
  },
);

const empresaSchema = z.object({
  nome: z.string().min(1),
  documento: z.string().nullable(),
  email_contato: z.string().nullable(),
  telefone_contato: z.string().nullable(),
});

export const vpsCriarEmpresaCliente = createServerFn({ method: "POST" })
  .inputValidator((data) => empresaSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      INSERT INTO public.empresas_clientes (nome, documento, email_contato, telefone_contato)
      VALUES (${data.nome}, ${data.documento}, ${data.email_contato}, ${data.telefone_contato})
    `;
    return { ok: true };
  });

export const vpsAtualizarEmpresaCliente = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    empresaSchema.extend({ id: z.string().uuid(), ativo: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    if (data.ativo !== undefined) {
      await ctx.sql`UPDATE public.empresas_clientes SET ativo = ${data.ativo} WHERE id = ${data.id}`;
    } else {
      await ctx.sql`
        UPDATE public.empresas_clientes
           SET nome = ${data.nome}, documento = ${data.documento},
               email_contato = ${data.email_contato}, telefone_contato = ${data.telefone_contato}
         WHERE id = ${data.id}
      `;
    }
    return { ok: true };
  });

type CanalRow = { id: string; nome: string; tipo: string; ativo: boolean };

export const vpsListarCanaisVenda = createServerFn({ method: "GET" }).handler(
  async (): Promise<CanalRow[]> => {
    const ctx = await contexto();
    await ctx.usuario();
    return ctx.sql<CanalRow[]>`
      SELECT id, nome, tipo, ativo FROM public.canais_venda ORDER BY nome
    `.then((r) => [...r]);
  },
);

const canalSchema = z.object({
  nome: z.string().min(1),
  tipo: z.enum(["ota", "site_proprio", "parceiro", "outro"]),
});

export const vpsCriarCanalVenda = createServerFn({ method: "POST" })
  .inputValidator((data) => canalSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`INSERT INTO public.canais_venda (nome, tipo) VALUES (${data.nome}, ${data.tipo})`;
    return { ok: true };
  });

export const vpsAtualizarCanalVenda = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    canalSchema.extend({ id: z.string().uuid(), ativo: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    if (data.ativo !== undefined) {
      await ctx.sql`UPDATE public.canais_venda SET ativo = ${data.ativo} WHERE id = ${data.id}`;
    } else {
      await ctx.sql`UPDATE public.canais_venda SET nome = ${data.nome}, tipo = ${data.tipo} WHERE id = ${data.id}`;
    }
    return { ok: true };
  });

// -------------------------------------------------------------- fornecedores
// (motoristas) — user_id referencia a MESMA tabela usuarios que a vitrine
// pública usa (cliente e motorista/admin compartilham o cadastro). Ver
// comentário em db/migrations/0007_carfleet_core.sql.
type FornecedorRow = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade_atuacao: string;
  categoria_veiculo_id: string | null;
  ativo: boolean;
};

// observacoes_internas mora numa tabela satélite (fornecedores_notas_internas)
// — mesmo motivo de pedidos_notas_internas: fica de fora do SELECT * de
// quem não é admin (aqui não tem problema, a função inteira já é admin-only).
type FornecedorListaRow = FornecedorRow & { observacoes_internas: string | null };

export const vpsListarFornecedores = createServerFn({ method: "GET" }).handler(
  async (): Promise<FornecedorListaRow[]> => {
    const ctx = await contexto();
    await ctx.admin();
    return ctx.sql<FornecedorListaRow[]>`
      SELECT f.id, f.nome, f.email, f.telefone, f.cidade_atuacao, f.categoria_veiculo_id, f.ativo,
             n.observacoes_internas
        FROM public.fornecedores f
        LEFT JOIN public.fornecedores_notas_internas n ON n.fornecedor_id = f.id
       ORDER BY f.nome
    `.then((linhas) => [...linhas]);
  },
);

export const vpsSalvarNotasFornecedor = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ fornecedorId: z.string().uuid(), texto: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      INSERT INTO public.fornecedores_notas_internas (fornecedor_id, observacoes_internas)
      VALUES (${data.fornecedorId}, ${data.texto})
      ON CONFLICT (fornecedor_id) DO UPDATE SET observacoes_internas = ${data.texto}, updated_at = now()
    `;
    return { ok: true };
  });

const criarMotoristaSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
  telefone: z.string().optional().default(""),
  cidade_atuacao: z.string().min(1),
  regiao_atuacao: z.string().optional().default(""),
  categoria_veiculo_id: z.string().uuid().nullable().optional(),
  observacoes_internas: z.string().optional().default(""),
});

export const vpsCriarMotorista = createServerFn({ method: "POST" })
  .inputValidator((data) => criarMotoristaSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    const { hashSenha } = await import("./auth.server");
    const senhaHash = await hashSenha(data.senha);

    try {
      return await ctx.sql.begin(async (sql) => {
        // Checagem prévia só pra dar o erro amigável no caso comum
        // (sequencial) sem esperar o banco reclamar — a garantia de
        // verdade é o índice único em usuarios(lower(email)), e duas
        // chamadas concorrentes pra este mesmo e-mail ainda podem passar
        // as duas por aqui antes de qualquer uma commitar. O catch abaixo
        // cobre esse caso, traduzindo a violação de unicidade (23505) do
        // Postgres pra mensagem amigável em vez do erro cru vazando —
        // achado revisando concorrência.
        const existentes = await sql<{ id: string }[]>`
          SELECT id FROM public.usuarios WHERE lower(email) = lower(${data.email})
        `;
        if (existentes.length) throw new Error("Já existe uma conta com este e-mail.");

        const [usuario] = await sql<{ id: string }[]>`
          INSERT INTO public.usuarios (email, senha_hash, nome, telefone, motorista)
          VALUES (${data.email.trim()}, ${senhaHash}, ${data.nome}, ${data.telefone || ""}, true)
          RETURNING id
        `;
        if (!usuario) throw new Error("Não foi possível criar o usuário.");

        const [fornecedor] = await sql<FornecedorRow[]>`
          INSERT INTO public.fornecedores
            (user_id, nome, email, telefone, cidade_atuacao, regiao_atuacao, categoria_veiculo_id)
          VALUES (${usuario.id}, ${data.nome}, ${data.email}, ${data.telefone || null},
                  ${data.cidade_atuacao}, ${data.regiao_atuacao || null}, ${data.categoria_veiculo_id ?? null})
          RETURNING id, nome, email, telefone, cidade_atuacao, categoria_veiculo_id, ativo
        `;
        if (!fornecedor) throw new Error("Não foi possível criar o cadastro de motorista.");

        if (data.observacoes_internas.trim()) {
          await sql`
            INSERT INTO public.fornecedores_notas_internas (fornecedor_id, observacoes_internas)
            VALUES (${fornecedor.id}, ${data.observacoes_internas.trim()})
          `;
        }

        return { userId: usuario.id, fornecedor };
      });
    } catch (erro) {
      if (erro && typeof erro === "object" && "code" in erro && erro.code === "23505") {
        throw new Error("Já existe uma conta com este e-mail.");
      }
      throw erro;
    }
  });

const reativarMotoristaSchema = z.object({
  fornecedorId: z.string().uuid(),
  email: z.string().email(),
  senha: z.string().min(8),
});

// Achado revisando UX: motorista desativado (vpsRemoverMotorista, quando já
// tem corridas no histórico) não tinha NENHUM jeito de voltar — a linha em
// fornecedores fica ativo=false/user_id=NULL, mas o usuarios original é
// apagado de vez, então não dá pra simplesmente "reverter" um boolean; tem
// que nascer um login novo pra essa mesma pessoa/fornecedor. Mesma
// transação/tratamento de e-mail duplicado de vpsCriarMotorista.
export const vpsReativarMotorista = createServerFn({ method: "POST" })
  .inputValidator((data) => reativarMotoristaSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    const { hashSenha } = await import("./auth.server");
    const senhaHash = await hashSenha(data.senha);

    try {
      return await ctx.sql.begin(async (sql) => {
        const [fornecedor] = await sql<{ id: string; nome: string; ativo: boolean }[]>`
          SELECT id, nome, ativo FROM public.fornecedores WHERE id = ${data.fornecedorId} FOR UPDATE
        `;
        if (!fornecedor) throw new Error("Motorista não encontrado.");
        if (fornecedor.ativo) throw new Error("Este motorista já está ativo.");

        const existentes = await sql<{ id: string }[]>`
          SELECT id FROM public.usuarios WHERE lower(email) = lower(${data.email})
        `;
        if (existentes.length) throw new Error("Já existe uma conta com este e-mail.");

        const [usuario] = await sql<{ id: string }[]>`
          INSERT INTO public.usuarios (email, senha_hash, nome, telefone, motorista)
          VALUES (${data.email.trim()}, ${senhaHash}, ${fornecedor.nome}, '', true)
          RETURNING id
        `;
        if (!usuario) throw new Error("Não foi possível criar o usuário.");

        const [atualizado] = await sql<FornecedorRow[]>`
          UPDATE public.fornecedores SET ativo = true, user_id = ${usuario.id}, email = ${data.email}
           WHERE id = ${fornecedor.id}
           RETURNING id, nome, email, telefone, cidade_atuacao, categoria_veiculo_id, ativo
        `;
        if (!atualizado) throw new Error("Não foi possível reativar o motorista.");
        return atualizado;
      });
    } catch (erro) {
      if (erro && typeof erro === "object" && "code" in erro && erro.code === "23505") {
        throw new Error("Já existe uma conta com este e-mail.");
      }
      throw erro;
    }
  });

export const vpsRemoverMotorista = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ fornecedorId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();

    return ctx.sql.begin(async (sql) => {
      const [fornecedor] = await sql<{ id: string; user_id: string | null }[]>`
        SELECT id, user_id FROM public.fornecedores WHERE id = ${data.fornecedorId}
      `;
      if (!fornecedor) throw new Error("Motorista não encontrado.");

      const [total] = await sql<{ total: string }[]>`
        SELECT count(*)::text AS total FROM public.pedidos WHERE fornecedor_id = ${fornecedor.id}
      `;

      if (Number(total?.total ?? "0") > 0) {
        // Preserva histórico: apenas desativa e revoga o acesso, em vez de
        // apagar. Decisão registrada (achado revisando integridade do
        // schema): DELETE FROM usuarios aqui é proposital, mesmo com
        // fornecedores mantido — fornecedores.email/telefone (denormalizado)
        // continua sendo o rastro de contato dessa pessoa. O que NÃO é
        // proposital é pedidos_historico.alterado_por perder a referência
        // (a FK é ON DELETE SET NULL, então um registro de histórico que
        // apontava pra este usuário como quem mudou o status vira NULL, sem
        // aviso). Não "consertar" isso pra ON DELETE CASCADE — isso
        // apagaria histórico de despacho de verdade só porque o motorista
        // saiu depois.
        await sql`
          UPDATE public.fornecedores SET ativo = false, user_id = NULL WHERE id = ${fornecedor.id}
        `;
        if (fornecedor.user_id)
          await sql`DELETE FROM public.usuarios WHERE id = ${fornecedor.user_id}`;
        return { desativado: true, removido: false };
      }

      await sql`DELETE FROM public.fornecedores WHERE id = ${fornecedor.id}`;
      if (fornecedor.user_id)
        await sql`DELETE FROM public.usuarios WHERE id = ${fornecedor.user_id}`;
      return { desativado: false, removido: true };
    });
  });

// -------------------------------------------------- importação por planilha
// "Onde subimos as planilhas": bulk-import de pedidos vindos de exportações
// de OTA/plataforma (ex.: "Sou Motorista") — ver componente
// src/components/import-pedidos-dialog.tsx, que faz o parse do .xlsx/.csv no
// navegador e manda aqui só as linhas já validadas/mapeadas.
const pedidoImportRowSchema = z.object({
  codigo_reserva_canal: z.string().trim().max(80).nullable().default(null),
  codigo_fornecedor_reserva: z.string().trim().max(80).nullable().default(null),
  passageiro_nome: z.string().trim().min(2).max(200),
  passageiro_telefone: z.string().trim().max(120).nullable().default(null),
  cidade_atendimento: z.string().trim().min(2).max(120),
  hotel: z.string().trim().max(200).nullable().default(null),
  data_hora_encontro: z.string(),
  direcao: z.enum(["IN", "OUT"]),
  numero_voo: z.string().trim().max(30).nullable().default(null),
  ponto_partida: z.string().trim().max(300).nullable().default(null),
  ponto_chegada: z.string().trim().max(300).nullable().default(null),
  canal_venda_id: z.string().uuid().nullable().default(null),
  categoria_veiculo_id: z.string().uuid().nullable().default(null),
  empresa_cliente_id: z.string().uuid().nullable().default(null),
});
const pedidosImportSchema = z.object({
  rows: z.array(pedidoImportRowSchema).min(1).max(2000),
});
export type PedidoImportRow = z.infer<typeof pedidoImportRowSchema>;

export const vpsVerificarCodigosExistentes = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ codigos: z.array(z.string()).max(2000) }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    if (!data.codigos.length) return [];
    const linhas = await ctx.sql<{ codigo_reserva_canal: string }[]>`
      SELECT codigo_reserva_canal FROM public.pedidos
       WHERE codigo_reserva_canal IN ${ctx.sql(data.codigos)}
    `;
    return linhas.map((l) => l.codigo_reserva_canal);
  });

export const vpsImportarPedidos = createServerFn({ method: "POST" })
  .inputValidator((data) => pedidosImportSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();

    const codigos = data.rows
      .map((r) => r.codigo_reserva_canal)
      .filter((c): c is string => Boolean(c && c.length > 0));

    const existentes = new Set<string>();
    for (let i = 0; i < codigos.length; i += 200) {
      const chunk = codigos.slice(i, i + 200);
      const linhas = await ctx.sql<{ codigo_reserva_canal: string }[]>`
        SELECT codigo_reserva_canal FROM public.pedidos WHERE codigo_reserva_canal IN ${ctx.sql(chunk)}
      `;
      for (const l of linhas) existentes.add(l.codigo_reserva_canal);
    }

    const vistos = new Set<string>();
    const aInserir = data.rows.filter((r) => {
      const c = r.codigo_reserva_canal;
      if (!c) return true;
      if (existentes.has(c) || vistos.has(c)) return false;
      vistos.add(c);
      return true;
    });
    const ignorados = data.rows.length - aInserir.length;

    let inseridos = 0;
    let ignoradosPorConflito = 0;
    await ctx.sql.begin(async (sql) => {
      for (const r of aInserir) {
        try {
          // Savepoint por linha — achado revisando concorrência: a
          // deduplicação acima (existentes/vistos) roda ANTES desta
          // transação abrir, então uma corrida real (outro import ou
          // vpsCriarPedido inserindo o mesmo codigo_reserva_canal entre a
          // checagem e este insert) ainda pode colidir com o índice único
          // parcial. Sem savepoint, essa colisão abortava a transação
          // inteira e descartava TODAS as linhas já inseridas antes dela
          // no mesmo lote, não só a conflitante.
          await sql.savepoint(async (sql) => {
            const [pedido] = await sql<{ id: number }[]>`
              INSERT INTO public.pedidos
                (codigo_reserva_canal, codigo_fornecedor_reserva, passageiro_nome, passageiro_telefone,
                 cidade_atendimento, hotel, data_hora_encontro, direcao, numero_voo, ponto_partida,
                 ponto_chegada, canal_venda_id, categoria_veiculo_id, empresa_cliente_id)
              VALUES (${r.codigo_reserva_canal}, ${r.codigo_fornecedor_reserva}, ${r.passageiro_nome},
                      ${r.passageiro_telefone}, ${r.cidade_atendimento}, ${r.hotel}, ${r.data_hora_encontro},
                      ${r.direcao}, ${r.numero_voo}, ${r.ponto_partida}, ${r.ponto_chegada},
                      ${r.canal_venda_id}, ${r.categoria_veiculo_id}, ${r.empresa_cliente_id})
              RETURNING id
            `;
            if (pedido) {
              await sql`
                INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo)
                VALUES (${pedido.id}, NULL, 'pendente_liberacao')
              `;
              inseridos += 1;
            }
          });
        } catch (erro) {
          if (erro && typeof erro === "object" && "code" in erro && erro.code === "23505") {
            ignoradosPorConflito += 1;
            continue;
          }
          throw erro;
        }
      }
    });

    return { inseridos, ignorados: ignorados + ignoradosPorConflito };
  });
