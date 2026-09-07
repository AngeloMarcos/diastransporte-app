// Adaptador de dados: as telas devem chamar SEMPRE estas funções, nunca o
// Supabase nem o Postgres da VPS direto. Em MODO_VPS caem nas server
// functions de src/lib/vps/dados.functions.ts; no Supabase Cloud seguem pelo
// cliente Supabase (RLS) e pelas server functions já existentes em
// src/lib/*.functions.ts. Mesmo padrão do projeto irmão Dias Transporte.
//
// transicionarStatus/atribuirMotorista ficam em src/lib/pedidos.tsx (não
// aqui) porque esse arquivo também exporta componentes de UI (StatusBadge)
// usados por quase toda rota de pedido — mover só criaria um import a mais
// em todo lugar sem ganho real.
import { supabase } from "@/integrations/supabase/client";
import { MODO_VPS } from "@/lib/vps/config";
import { getMyRole } from "@/lib/auth.functions";
import { createMotorista, removerMotorista as removerMotoristaFn } from "@/lib/motoristas.functions";
import type { PedidoStatus } from "@/lib/pedidos-transicoes";
import { importarPedidos as importarPedidosFn } from "@/lib/pedidos.functions";
import { entrar as vpsEntrar, sair as vpsSair, sessaoAtual } from "@/lib/vps/sessao.functions";
import type { PedidoImportRow } from "@/lib/pedidos-import.schema";
import {
  vpsAtualizarCanal,
  vpsAtualizarCategoria,
  vpsAtualizarEmpresa,
  vpsAtualizarMeuPerfil,
  vpsCriarCanal,
  vpsCriarCategoria,
  vpsCriarEmpresa,
  vpsCriarMotorista,
  vpsCriarPedido,
  vpsDashboardAdmin,
  vpsImportarPedidos,
  vpsListarCanais,
  vpsListarCategorias,
  vpsListarEmpresas,
  vpsListarFornecedores,
  vpsListarFornecedoresAtivos,
  vpsListarPedidosAdmin,
  vpsListarPedidosMotorista,
  vpsMeuFornecedor,
  vpsMotoristaResumo,
  vpsObterMeuPapel,
  vpsPedidoDetalheAdmin,
  vpsPedidoDetalheMotorista,
  vpsRemoverMotorista,
  vpsSalvarNotasInternas,
  vpsSalvarObservacaoMotorista,
  vpsTrocarMinhaSenha,
  vpsVerificarCodigosExistentes,
} from "@/lib/vps/dados.functions";

function erro(e: { message: string } | null): void {
  if (e) throw new Error(e.message);
}

// ------------------------------------------------------------------- sessão
export async function sessaoAtiva(): Promise<boolean> {
  if (MODO_VPS) return Boolean(await sessaoAtual());
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function entrarSessao(email: string, senha: string): Promise<void> {
  if (MODO_VPS) {
    await vpsEntrar({ data: { email, senha } });
    return;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  erro(error);
}

export async function sairSessao(): Promise<void> {
  if (MODO_VPS) {
    await vpsSair();
    return;
  }
  await supabase.auth.signOut();
}

// -------------------------------------------------------------------- papel
export async function obterMeuPapel(): Promise<{
  role: "admin" | "motorista" | null;
  fornecedorId: string | null;
}> {
  if (MODO_VPS) return vpsObterMeuPapel();
  return getMyRole();
}

// --------------------------------------------------------------- fornecedores
export type Fornecedor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade_atuacao: string;
  ativo: boolean;
};

export async function listarFornecedores(): Promise<Fornecedor[]> {
  if (MODO_VPS) return vpsListarFornecedores();
  const { data, error } = await supabase
    .from("fornecedores")
    .select("id, nome, email, telefone, cidade_atuacao, ativo")
    .order("nome");
  erro(error);
  return (data ?? []) as Fornecedor[];
}

export async function listarFornecedoresAtivos(): Promise<
  { id: string; nome: string; cidade_atuacao: string }[]
> {
  if (MODO_VPS) return vpsListarFornecedoresAtivos();
  const { data, error } = await supabase
    .from("fornecedores")
    .select("id,nome,cidade_atuacao")
    .eq("ativo", true)
    .order("nome");
  erro(error);
  return (data ?? []) as { id: string; nome: string; cidade_atuacao: string }[];
}

export type NovoMotoristaInput = {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  cidade_atuacao: string;
  regiao_atuacao: string;
  categoria_veiculo_id?: string | null;
  observacoes_internas: string;
};

export async function criarNovoMotorista(input: NovoMotoristaInput) {
  if (MODO_VPS) return vpsCriarMotorista({ data: input });
  return createMotorista({ data: input });
}

export async function removerCadastroMotorista(fornecedorId: string) {
  if (MODO_VPS) return vpsRemoverMotorista({ data: { fornecedorId } });
  const res = await removerMotoristaFn({ data: { fornecedor_id: fornecedorId } });
  return res;
}

export async function meuFornecedor(): Promise<{
  id: string;
  nome: string;
  telefone: string | null;
  cidade_atuacao: string;
  email: string;
} | null> {
  if (MODO_VPS) return vpsMeuFornecedor();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("fornecedores")
    .select("id,nome,telefone,cidade_atuacao")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!data) return null;
  return { ...(data as { id: string; nome: string; telefone: string | null; cidade_atuacao: string }), email: u.user.email ?? "" };
}

export async function atualizarMeuPerfil(nome: string, telefone: string | null): Promise<void> {
  if (MODO_VPS) {
    await vpsAtualizarMeuPerfil({ data: { nome, telefone } });
    return;
  }
  const fornecedor = await meuFornecedor();
  if (!fornecedor) throw new Error("Cadastro de motorista não encontrado.");
  const { error } = await supabase
    .from("fornecedores")
    .update({ nome, telefone })
    .eq("id", fornecedor.id);
  erro(error);
}

export async function trocarMinhaSenha(novaSenha: string): Promise<void> {
  if (MODO_VPS) {
    await vpsTrocarMinhaSenha({ data: { novaSenha } });
    return;
  }
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  erro(error);
}

// -------------------------------------------------------------------- pedidos
export type FiltroPedidos = {
  codigo?: string;
  canal?: string;
  status?: PedidoStatus;
  empresa?: string;
  fornecedor?: string;
  direcao?: "IN" | "OUT";
  passageiro?: string;
  cidade?: string;
  tipoData?: "atividade" | "emissao" | "alteracao";
  de?: string;
  ate?: string;
};

function colunaData(tipo: FiltroPedidos["tipoData"]) {
  if (tipo === "emissao") return "data_emissao";
  if (tipo === "alteracao") return "data_alteracao";
  return "data_hora_encontro";
}

export async function listarPedidosAdmin(f: FiltroPedidos) {
  if (MODO_VPS) return vpsListarPedidosAdmin({ data: f });

  let q = supabase
    .from("pedidos")
    .select(
      `id, codigo_reserva_canal, empresa_cliente_id, canal_venda_id, cidade_atendimento, hotel,
       data_hora_encontro, data_emissao, data_alteracao, direcao, passageiro_nome, fornecedor_id, status,
       empresas_clientes(nome), canais_venda(nome), fornecedores(nome)`,
    )
    .order("data_hora_encontro", { ascending: false })
    .limit(500);

  if (f.codigo) q = q.ilike("codigo_reserva_canal", `%${f.codigo}%`);
  if (f.canal) q = q.eq("canal_venda_id", f.canal);
  if (f.status) q = q.eq("status", f.status);
  if (f.empresa) q = q.eq("empresa_cliente_id", f.empresa);
  if (f.fornecedor === "none") q = q.is("fornecedor_id", null);
  else if (f.fornecedor) q = q.eq("fornecedor_id", f.fornecedor);
  if (f.direcao) q = q.eq("direcao", f.direcao);
  if (f.passageiro) q = q.ilike("passageiro_nome", `%${f.passageiro}%`);
  if (f.cidade) q = q.ilike("cidade_atendimento", `%${f.cidade}%`);
  if (f.de || f.ate) {
    const col = colunaData(f.tipoData);
    if (f.de) q = q.gte(col, new Date(f.de).toISOString());
    if (f.ate) {
      const d = new Date(f.ate);
      d.setHours(23, 59, 59, 999);
      q = q.lte(col, d.toISOString());
    }
  }
  const { data, error } = await q;
  erro(error);
  return data ?? [];
}

export async function listarPedidosMotorista(f: Omit<FiltroPedidos, "empresa" | "fornecedor">) {
  if (MODO_VPS) return vpsListarPedidosMotorista({ data: f });

  let q = supabase
    .from("pedidos")
    .select(
      `id, codigo_reserva_canal, cidade_atendimento, hotel, data_hora_encontro, direcao, status,
       passageiro_nome, empresa_nome, canais_venda(nome)`,
    )
    .order("data_hora_encontro", { ascending: false })
    .limit(200);

  if (f.codigo) q = q.ilike("codigo_reserva_canal", `%${f.codigo}%`);
  if (f.canal) q = q.eq("canal_venda_id", f.canal);
  if (f.status) q = q.eq("status", f.status);
  if (f.direcao) q = q.eq("direcao", f.direcao);
  if (f.passageiro) q = q.ilike("passageiro_nome", `%${f.passageiro}%`);
  if (f.cidade) q = q.ilike("cidade_atendimento", `%${f.cidade}%`);
  if (f.de || f.ate) {
    const col = colunaData(f.tipoData);
    if (f.de) q = q.gte(col, new Date(f.de).toISOString());
    if (f.ate) {
      const d = new Date(f.ate);
      d.setHours(23, 59, 59, 999);
      q = q.lte(col, d.toISOString());
    }
  }
  const { data, error } = await q;
  erro(error);
  return data ?? [];
}

export async function pedidoDetalheAdmin(id: number) {
  if (MODO_VPS) return vpsPedidoDetalheAdmin({ data: { id } });

  const { data, error } = await supabase
    .from("pedidos")
    .select(`*, empresas_clientes(nome), canais_venda(nome), categorias_veiculo(nome), fornecedores(id,nome)`)
    .eq("id", id)
    .maybeSingle();
  erro(error);
  if (!data) return null;

  const { data: nota } = await supabase
    .from("pedidos_notas_internas")
    .select("observacoes_internas")
    .eq("pedido_id", id)
    .maybeSingle();
  const { data: historico } = await supabase
    .from("pedidos_historico")
    .select("*")
    .eq("pedido_id", id)
    .order("created_at", { ascending: false });

  return {
    ...data,
    observacoes_internas: (nota as { observacoes_internas: string | null } | null)?.observacoes_internas ?? "",
    historico: historico ?? [],
  };
}

export async function pedidoDetalheMotorista(id: number) {
  if (MODO_VPS) return vpsPedidoDetalheMotorista({ data: { id } });

  const { data, error } = await supabase
    .from("pedidos")
    .select(`*, canais_venda(nome), categorias_veiculo(nome), fornecedores(nome)`)
    .eq("id", id)
    .maybeSingle();
  erro(error);
  return data ?? null;
}

export async function motoristaResumo() {
  if (MODO_VPS) return vpsMotoristaResumo();

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date();
  fimHoje.setHours(23, 59, 59, 999);
  const fimSemana = new Date();
  fimSemana.setDate(fimSemana.getDate() + 7);
  fimSemana.setHours(23, 59, 59, 999);

  const cols = "id,cidade_atendimento,hotel,data_hora_encontro,direcao,status";
  const { data: hoje } = await supabase
    .from("pedidos")
    .select(cols)
    .gte("data_hora_encontro", inicioHoje.toISOString())
    .lte("data_hora_encontro", fimHoje.toISOString())
    .order("data_hora_encontro");
  const { data: semana } = await supabase
    .from("pedidos")
    .select(cols)
    .gt("data_hora_encontro", fimHoje.toISOString())
    .lte("data_hora_encontro", fimSemana.toISOString())
    .order("data_hora_encontro");
  return { hoje: hoje ?? [], semana: semana ?? [] };
}

export async function dashboardAdmin() {
  if (MODO_VPS) return vpsDashboardAdmin();

  const { data: all } = await supabase.from("pedidos").select("status");
  const porStatus: Record<string, number> = {};
  (all ?? []).forEach((r) => {
    const s = (r as { status: string }).status;
    porStatus[s] = (porStatus[s] ?? 0) + 1;
  });

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date();
  fimHoje.setHours(23, 59, 59, 999);

  const { data: hoje } = await supabase
    .from("pedidos")
    .select("id,passageiro_nome,cidade_atendimento,data_hora_encontro,status,direcao")
    .gte("data_hora_encontro", inicioHoje.toISOString())
    .lte("data_hora_encontro", fimHoje.toISOString())
    .order("data_hora_encontro");
  const { data: semMotorista } = await supabase
    .from("pedidos")
    .select("id,passageiro_nome,cidade_atendimento,data_hora_encontro,status")
    .is("fornecedor_id", null)
    .order("data_hora_encontro", { ascending: false })
    .limit(20);

  return { porStatus, hoje: hoje ?? [], semMotorista: semMotorista ?? [] };
}

export type NovoPedidoInput = {
  codigo_reserva_canal: string | null;
  empresa_cliente_id: string | null;
  canal_venda_id: string | null;
  cidade_atendimento: string;
  hotel: string | null;
  data_hora_encontro: string;
  direcao: "IN" | "OUT";
  passageiro_nome: string;
  passageiro_telefone: string | null;
  ponto_partida: string | null;
  ponto_chegada: string | null;
  numero_voo: string | null;
  categoria_veiculo_id: string | null;
  observacoes_internas: string;
};

export async function criarPedido(input: NovoPedidoInput): Promise<{ id: number }> {
  if (MODO_VPS) return vpsCriarPedido({ data: input });

  const { observacoes_internas: notaInterna, ...payload } = input;
  const { data: novo, error } = await supabase.from("pedidos").insert(payload).select("id").single();
  erro(error);
  if (novo && notaInterna.trim()) {
    await supabase
      .from("pedidos_notas_internas")
      .insert({ pedido_id: novo.id, observacoes_internas: notaInterna.trim() });
  }
  return novo as { id: number };
}

export async function verificarCodigosExistentes(codigos: string[]): Promise<string[]> {
  if (!codigos.length) return [];
  if (MODO_VPS) return vpsVerificarCodigosExistentes({ data: { codigos } });
  const existentes: string[] = [];
  for (let i = 0; i < codigos.length; i += 200) {
    const chunk = codigos.slice(i, i + 200);
    const { data } = await supabase.from("pedidos").select("codigo_reserva_canal").in("codigo_reserva_canal", chunk);
    (data ?? []).forEach((d) => {
      const c = (d as { codigo_reserva_canal: string | null }).codigo_reserva_canal;
      if (c) existentes.push(c);
    });
  }
  return existentes;
}

export async function importarPedidos(rows: PedidoImportRow[]): Promise<{ inseridos: number; ignorados: number }> {
  if (MODO_VPS) return vpsImportarPedidos({ data: { rows } });
  return importarPedidosFn({ data: { rows } });
}

export async function salvarNotasInternas(pedidoId: number, texto: string): Promise<void> {
  if (MODO_VPS) {
    await vpsSalvarNotasInternas({ data: { pedidoId, texto } });
    return;
  }
  const { error } = await supabase
    .from("pedidos_notas_internas")
    .upsert({ pedido_id: pedidoId, observacoes_internas: texto }, { onConflict: "pedido_id" });
  erro(error);
}

export async function salvarObservacaoMotorista(pedidoId: number, texto: string): Promise<void> {
  if (MODO_VPS) {
    await vpsSalvarObservacaoMotorista({ data: { pedidoId, texto } });
    return;
  }
  const { error } = await supabase.from("pedidos").update({ observacao_motorista: texto }).eq("id", pedidoId);
  erro(error);
}

// -------------------------------------------------------- cadastros simples
export type Categoria = { id: string; nome: string; capacidade_passageiros: number | null; ativo: boolean };

export async function listarCategorias(somenteAtivas = false): Promise<Categoria[]> {
  if (MODO_VPS) return vpsListarCategorias({ data: { somenteAtivas } });
  let q = supabase.from("categorias_veiculo").select("*").order("nome");
  if (somenteAtivas) q = q.eq("ativo", true);
  const { data, error } = await q;
  erro(error);
  return (data ?? []) as Categoria[];
}

export async function criarCategoria(nome: string, capacidade_passageiros: number | null): Promise<void> {
  if (MODO_VPS) {
    await vpsCriarCategoria({ data: { nome, capacidade_passageiros } });
    return;
  }
  const { error } = await supabase.from("categorias_veiculo").insert({ nome, capacidade_passageiros });
  erro(error);
}

export async function atualizarCategoria(
  id: string,
  campos: { nome: string; capacidade_passageiros: number | null } | { ativo: boolean },
): Promise<void> {
  if (MODO_VPS) {
    await vpsAtualizarCategoria({
      data:
        "ativo" in campos
          ? { id, ativo: campos.ativo, nome: "", capacidade_passageiros: null }
          : { id, ...campos },
    });
    return;
  }
  const { error } = await supabase.from("categorias_veiculo").update(campos).eq("id", id);
  erro(error);
}

export type Empresa = {
  id: string;
  nome: string;
  documento: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
  ativo: boolean;
};

export async function listarEmpresas(somenteAtivas = false): Promise<Empresa[]> {
  if (MODO_VPS) return vpsListarEmpresas({ data: { somenteAtivas } });
  let q = supabase.from("empresas_clientes").select("*").order("nome");
  if (somenteAtivas) q = q.eq("ativo", true);
  const { data, error } = await q;
  erro(error);
  return (data ?? []) as Empresa[];
}

export async function criarEmpresa(campos: {
  nome: string;
  documento: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
}): Promise<void> {
  if (MODO_VPS) {
    await vpsCriarEmpresa({ data: campos });
    return;
  }
  const { error } = await supabase.from("empresas_clientes").insert(campos);
  erro(error);
}

export async function atualizarEmpresa(
  id: string,
  campos:
    | { nome: string; documento: string | null; email_contato: string | null; telefone_contato: string | null }
    | { ativo: boolean },
): Promise<void> {
  if (MODO_VPS) {
    await vpsAtualizarEmpresa({
      data:
        "ativo" in campos
          ? { id, ativo: campos.ativo, nome: "", documento: null, email_contato: null, telefone_contato: null }
          : { id, ...campos },
    });
    return;
  }
  const { error } = await supabase.from("empresas_clientes").update(campos).eq("id", id);
  erro(error);
}

export type Canal = { id: string; nome: string; tipo: string; ativo: boolean };

export async function listarCanais(somenteAtivos = false): Promise<Canal[]> {
  if (MODO_VPS) return vpsListarCanais({ data: { somenteAtivos } });
  let q = supabase.from("canais_venda").select("*").order("nome");
  if (somenteAtivos) q = q.eq("ativo", true);
  const { data, error } = await q;
  erro(error);
  return (data ?? []) as Canal[];
}

export async function criarCanal(nome: string, tipo: string): Promise<void> {
  if (MODO_VPS) {
    await vpsCriarCanal({ data: { nome, tipo: tipo as "ota" | "site_proprio" | "parceiro" | "outro" } });
    return;
  }
  const { error } = await supabase.from("canais_venda").insert({ nome, tipo });
  erro(error);
}

export async function atualizarCanal(
  id: string,
  campos: { nome: string; tipo: string } | { ativo: boolean },
): Promise<void> {
  if (MODO_VPS) {
    await vpsAtualizarCanal({
      data:
        "ativo" in campos
          ? { id, ativo: campos.ativo, nome: "", tipo: "outro" }
          : { id, nome: campos.nome, tipo: campos.tipo as "ota" | "site_proprio" | "parceiro" | "outro" },
    });
    return;
  }
  const { error } = await supabase.from("canais_venda").update(campos).eq("id", id);
  erro(error);
}
