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
