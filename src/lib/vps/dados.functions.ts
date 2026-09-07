// Camada de dados do deploy próprio (VPS): tudo que no Supabase Cloud passa
// pelo cliente Supabase + RLS + as funções SECURITY DEFINER
// (fn_transicionar_status, fn_atribuir_motorista, has_role...) aqui passa por
// estas server functions, que autorizam pela sessão em cookie
// (auth.server.ts) antes de tocar no Postgres — sem RLS, sem policy: só o
// servidor Node fala com este banco, então a autorização (quem pode ver o
// quê, quem pode mudar o quê) é decidida aqui, em TypeScript, não em SQL.
// Só é chamado quando VITE_AUTH_MODE=vps (ver src/lib/dados.ts).
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { transicaoValida, type PedidoStatus } from "@/lib/pedidos-transicoes";
import { pedidosImportSchema } from "@/lib/pedidos-import.schema";

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

// ------------------------------------------------------------------ papel
export const vpsObterMeuPapel = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ role: "admin" | "motorista" | null; fornecedorId: string | null }> => {
    const ctx = await contexto();
    const usuario = await ctx.usuario();
    const role: "admin" | "motorista" | null = usuario.admin
      ? "admin"
      : usuario.motorista
        ? "motorista"
        : null;
    let fornecedorId: string | null = null;
    if (role === "motorista") {
      const linhas = await ctx.sql<{ id: string }[]>`
        SELECT id FROM public.fornecedores WHERE user_id = ${usuario.id} LIMIT 1
      `;
      fornecedorId = linhas[0]?.id ?? null;
    }
    return { role, fornecedorId };
  },
);

/** Corrida do próprio motorista logado -> fornecedor_id dele, ou erro. */
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

// ------------------------------------------------------------- fornecedores
type FornecedorRow = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade_atuacao: string;
  ativo: boolean;
};

export const vpsListarFornecedores = createServerFn({ method: "GET" }).handler(
  async (): Promise<FornecedorRow[]> => {
    const ctx = await contexto();
    await ctx.admin();
    return ctx.sql<FornecedorRow[]>`
      SELECT id, nome, email, telefone, cidade_atuacao, ativo
        FROM public.fornecedores ORDER BY nome
    `.then((linhas) => [...linhas]);
  },
);

export const vpsListarFornecedoresAtivos = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ id: string; nome: string; cidade_atuacao: string }[]> => {
    const ctx = await contexto();
    await ctx.usuario();
    return ctx.sql<{ id: string; nome: string; cidade_atuacao: string }[]>`
      SELECT id, nome, cidade_atuacao FROM public.fornecedores WHERE ativo = true ORDER BY nome
    `.then((linhas) => [...linhas]);
  },
);

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

    return ctx.sql.begin(async (sql) => {
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
        RETURNING id, nome, email, telefone, cidade_atuacao, ativo
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

      const [{ total }] = await sql<{ total: string }[]>`
        SELECT count(*)::text AS total FROM public.pedidos WHERE fornecedor_id = ${fornecedor.id}
      `;

      if (Number(total) > 0) {
        // Preserva histórico: apenas desativa e revoga o acesso.
        await sql`
          UPDATE public.fornecedores SET ativo = false, user_id = NULL WHERE id = ${fornecedor.id}
        `;
        if (fornecedor.user_id) await sql`DELETE FROM public.usuarios WHERE id = ${fornecedor.user_id}`;
        return { desativado: true, removido: false };
      }

      await sql`DELETE FROM public.fornecedores WHERE id = ${fornecedor.id}`;
      if (fornecedor.user_id) await sql`DELETE FROM public.usuarios WHERE id = ${fornecedor.user_id}`;
      return { desativado: false, removido: true };
    });
  });

export const vpsMeuFornecedor = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ id: string; nome: string; telefone: string | null; cidade_atuacao: string; email: string } | null> => {
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

const perfilSchema = z.object({
  nome: z.string().min(2).max(200),
  telefone: z.string().max(120).nullable(),
});

// Só nome/telefone podem ser alterados pelo próprio motorista — mesma
// restrição que fornecedores_motorista_guard aplicava via trigger no
// Supabase; aqui não precisa de trigger porque é a única forma de escrever
// nesta tabela vinda de um motorista (o admin tem sua própria função).
export const vpsAtualizarMeuPerfil = createServerFn({ method: "POST" })
  .inputValidator((data) => perfilSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const usuario = await ctx.motorista();
    await ctx.sql`
      UPDATE public.fornecedores
         SET nome = ${data.nome.trim()}, telefone = ${data.telefone?.trim() || null}
       WHERE user_id = ${usuario.id}
    `;
    return { ok: true };
  });

export const vpsTrocarMinhaSenha = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ novaSenha: z.string().min(8) }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const usuario = await ctx.usuario();
    const { hashSenha } = await import("./auth.server");
    const hash = await hashSenha(data.novaSenha);
    await ctx.sql`UPDATE public.usuarios SET senha_hash = ${hash} WHERE id = ${usuario.id}`;
    return { ok: true };
  });

// ----------------------------------------------------------------- pedidos
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

    const linhas = await sql`
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
      empresas_clientes: r["empresa_nome_join"] ? { nome: r["empresa_nome_join"] } : null,
      canais_venda: r["canal_nome"] ? { nome: r["canal_nome"] } : null,
      fornecedores: r["fornecedor_nome"] ? { nome: r["fornecedor_nome"] } : null,
    }));
  });

const filtroPedidosMotorista = filtroPedidos.omit({ empresa: true, fornecedor: true });

export const vpsListarPedidosMotorista = createServerFn({ method: "GET" })
  .inputValidator((data) => filtroPedidosMotorista.parse(data ?? {}))
  .handler(async ({ data: f }) => {
    const ctx = await contexto();
    const usuario = await ctx.motorista();
    const fornecedorId = await fornecedorDoMotorista(ctx, usuario.id);
    const sql = ctx.sql;

    let cond = sql`p.fornecedor_id = ${fornecedorId}`;
    if (f.codigo) cond = sql`${cond} AND p.codigo_reserva_canal ILIKE ${"%" + f.codigo + "%"}`;
    if (f.canal) cond = sql`${cond} AND p.canal_venda_id = ${f.canal}`;
    if (f.status) cond = sql`${cond} AND p.status = ${f.status}`;
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

    const linhas = await sql`
      SELECT p.id, p.codigo_reserva_canal, p.cidade_atendimento, p.hotel, p.data_hora_encontro,
             p.direcao, p.status, p.passageiro_nome, p.empresa_nome, c.nome AS canal_nome
        FROM public.pedidos p
        LEFT JOIN public.canais_venda c ON c.id = p.canal_venda_id
       WHERE ${cond}
       ORDER BY p.data_hora_encontro DESC
       LIMIT 200
    `;
    return linhas.map((r) => ({ ...r, canais_venda: r["canal_nome"] ? { nome: r["canal_nome"] } : null }));
  });

export const vpsPedidoDetalheAdmin = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.number().int() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    const linhas = await ctx.sql`
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
    const historico = await ctx.sql`
      SELECT id, status_anterior, status_novo, alterado_em AS created_at
        FROM public.pedidos_historico WHERE pedido_id = ${data.id} ORDER BY alterado_em DESC
    `;

    return {
      ...p,
      empresas_clientes: p["empresa_nome_join"] ? { nome: p["empresa_nome_join"] } : null,
      canais_venda: p["canal_nome"] ? { nome: p["canal_nome"] } : null,
      categorias_veiculo: p["categoria_nome"] ? { nome: p["categoria_nome"] } : null,
      fornecedores: p["fornecedor_nome"] ? { id: p["fornecedor_id_join"], nome: p["fornecedor_nome"] } : null,
      observacoes_internas: nota?.observacoes_internas ?? "",
      historico: [...historico],
    };
  });

export const vpsPedidoDetalheMotorista = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.number().int() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const usuario = await ctx.motorista();
    const fornecedorId = await fornecedorDoMotorista(ctx, usuario.id);
    const linhas = await ctx.sql`
      SELECT p.*, c.nome AS canal_nome, cat.nome AS categoria_nome, f.nome AS fornecedor_nome
        FROM public.pedidos p
        LEFT JOIN public.canais_venda c ON c.id = p.canal_venda_id
        LEFT JOIN public.categorias_veiculo cat ON cat.id = p.categoria_veiculo_id
        LEFT JOIN public.fornecedores f ON f.id = p.fornecedor_id
       WHERE p.id = ${data.id} AND p.fornecedor_id = ${fornecedorId}
    `;
    const p = linhas[0];
    if (!p) return null;
    return {
      ...p,
      canais_venda: p["canal_nome"] ? { nome: p["canal_nome"] } : null,
      categorias_veiculo: p["categoria_nome"] ? { nome: p["categoria_nome"] } : null,
      fornecedores: p["fornecedor_nome"] ? { nome: p["fornecedor_nome"] } : null,
    };
  });

export const vpsMotoristaResumo = createServerFn({ method: "GET" }).handler(async () => {
  const ctx = await contexto();
  const usuario = await ctx.motorista();
  const fornecedorId = await fornecedorDoMotorista(ctx, usuario.id);
  const cols = ctx.sql`id, cidade_atendimento, hotel, data_hora_encontro, direcao, status`;

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date();
  fimHoje.setHours(23, 59, 59, 999);
  const fimSemana = new Date();
  fimSemana.setDate(fimSemana.getDate() + 7);
  fimSemana.setHours(23, 59, 59, 999);

  const hoje = await ctx.sql`
    SELECT ${cols} FROM public.pedidos
     WHERE fornecedor_id = ${fornecedorId}
       AND data_hora_encontro BETWEEN ${inicioHoje.toISOString()} AND ${fimHoje.toISOString()}
     ORDER BY data_hora_encontro
  `;
  const semana = await ctx.sql`
    SELECT ${cols} FROM public.pedidos
     WHERE fornecedor_id = ${fornecedorId}
       AND data_hora_encontro > ${fimHoje.toISOString()} AND data_hora_encontro <= ${fimSemana.toISOString()}
     ORDER BY data_hora_encontro
  `;
  return { hoje: [...hoje], semana: [...semana] };
});

export const vpsDashboardAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const ctx = await contexto();
  await ctx.admin();

  const porStatusLinhas = await ctx.sql<{ status: PedidoStatus; total: string }[]>`
    SELECT status, count(*)::text AS total FROM public.pedidos GROUP BY status
  `;
  const porStatus: Record<string, number> = {};
  for (const l of porStatusLinhas) porStatus[l.status] = Number(l.total);

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date();
  fimHoje.setHours(23, 59, 59, 999);

  const hoje = await ctx.sql`
    SELECT id, passageiro_nome, cidade_atendimento, data_hora_encontro, status, direcao
      FROM public.pedidos
     WHERE data_hora_encontro BETWEEN ${inicioHoje.toISOString()} AND ${fimHoje.toISOString()}
     ORDER BY data_hora_encontro
  `;
  const semMotorista = await ctx.sql`
    SELECT id, passageiro_nome, cidade_atendimento, data_hora_encontro, status
      FROM public.pedidos
     WHERE fornecedor_id IS NULL
     ORDER BY data_hora_encontro DESC
     LIMIT 20
  `;
  return { porStatus, hoje: [...hoje], semMotorista: [...semMotorista] };
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
      .filter((c): c is string => !!c && c.length > 0);

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
    await ctx.sql.begin(async (sql) => {
      for (const r of aInserir) {
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
      }
    });

    return { inseridos, ignorados };
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
    if (!linhas[0]) throw new Error("Pedido não encontrado ou não atribuído a este motorista.");
    return { ok: true };
  });

export const vpsTransicionarStatus = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ pedidoId: z.number().int(), novoStatus: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const usuario = await ctx.usuario();
    const papel: "admin" | "motorista" = usuario.admin ? "admin" : "motorista";

    return ctx.sql.begin(async (sql) => {
      const [pedido] = await sql<{ id: number; status: PedidoStatus; fornecedor_id: string | null }[]>`
        SELECT id, status, fornecedor_id FROM public.pedidos WHERE id = ${data.pedidoId} FOR UPDATE
      `;
      if (!pedido) throw new Error(`Pedido ${data.pedidoId} não encontrado`);

      if (papel === "motorista") {
        const fornecedorId = await fornecedorDoMotorista(ctx, usuario.id);
        if (pedido.fornecedor_id !== fornecedorId) {
          throw new Error("Pedido não pertence a este motorista");
        }
      }

      if (!transicaoValida(pedido.status, data.novoStatus as PedidoStatus, papel)) {
        throw new Error(`Transição inválida: ${pedido.status} -> ${data.novoStatus}`);
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

export const vpsAtribuirMotorista = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ pedidoId: z.number().int(), fornecedorId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const admin = await ctx.admin();

    return ctx.sql.begin(async (sql) => {
      const [antes] = await sql<{ status: PedidoStatus }[]>`
        SELECT status FROM public.pedidos WHERE id = ${data.pedidoId} FOR UPDATE
      `;
      if (!antes) throw new Error(`Pedido ${data.pedidoId} não encontrado`);

      const novoStatus: PedidoStatus = (
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

// -------------------------------------------------- cadastros simples (CRUD)
type CategoriaRow = { id: string; nome: string; capacidade_passageiros: number | null; ativo: boolean };

export const vpsListarCategorias = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ somenteAtivas: z.boolean().optional() }).parse(data ?? {}))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.usuario();
    if (data.somenteAtivas) {
      return ctx.sql<CategoriaRow[]>`
        SELECT id, nome, capacidade_passageiros, ativo FROM public.categorias_veiculo
         WHERE ativo = true ORDER BY nome
      `.then((r) => [...r]);
    }
    return ctx.sql<CategoriaRow[]>`
      SELECT id, nome, capacidade_passageiros, ativo FROM public.categorias_veiculo ORDER BY nome
    `.then((r) => [...r]);
  });

const categoriaSchema = z.object({
  nome: z.string().min(1),
  // .positive(): nada validava isso antes (nem aqui, nem no banco até
  // ck_categorias_capacidade em 0003_constraints.sql) — um admin conseguia
  // salvar 0 ou capacidade negativa sem erro nenhum.
  capacidade_passageiros: z.number().int().positive().nullable(),
});

export const vpsCriarCategoria = createServerFn({ method: "POST" })
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

export const vpsAtualizarCategoria = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    categoriaSchema
      .extend({ id: z.string().uuid(), ativo: z.boolean().optional() })
      .parse(data),
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

export const vpsListarEmpresas = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ somenteAtivas: z.boolean().optional() }).parse(data ?? {}))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.usuario();
    if (data.somenteAtivas) {
      return ctx.sql<EmpresaRow[]>`
        SELECT id, nome, documento, email_contato, telefone_contato, ativo FROM public.empresas_clientes
         WHERE ativo = true ORDER BY nome
      `.then((r) => [...r]);
    }
    return ctx.sql<EmpresaRow[]>`
      SELECT id, nome, documento, email_contato, telefone_contato, ativo FROM public.empresas_clientes
       ORDER BY nome
    `.then((r) => [...r]);
  });

const empresaSchema = z.object({
  nome: z.string().min(1),
  documento: z.string().nullable(),
  email_contato: z.string().nullable(),
  telefone_contato: z.string().nullable(),
});

export const vpsCriarEmpresa = createServerFn({ method: "POST" })
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

export const vpsAtualizarEmpresa = createServerFn({ method: "POST" })
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

export const vpsListarCanais = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ somenteAtivos: z.boolean().optional() }).parse(data ?? {}))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.usuario();
    if (data.somenteAtivos) {
      return ctx.sql<CanalRow[]>`
        SELECT id, nome, tipo, ativo FROM public.canais_venda WHERE ativo = true ORDER BY nome
      `.then((r) => [...r]);
    }
    return ctx.sql<CanalRow[]>`SELECT id, nome, tipo, ativo FROM public.canais_venda ORDER BY nome`.then(
      (r) => [...r],
    );
  });

const canalSchema = z.object({
  nome: z.string().min(1),
  tipo: z.enum(["ota", "site_proprio", "parceiro", "outro"]),
});

export const vpsCriarCanal = createServerFn({ method: "POST" })
  .inputValidator((data) => canalSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`INSERT INTO public.canais_venda (nome, tipo) VALUES (${data.nome}, ${data.tipo})`;
    return { ok: true };
  });

export const vpsAtualizarCanal = createServerFn({ method: "POST" })
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
