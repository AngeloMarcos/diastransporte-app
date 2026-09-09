// Adaptador de dados: as telas chamam SEMPRE estas funções, nunca o backend
// direto. Em MODO_VPS elas caem nas server functions de src/lib/vps/*; no
// Lovable Cloud seguem pelo cliente Supabase + RLS (comportamento atual).
// Quando o site estiver 100% na VPS, basta apagar os ramos "cloud" daqui.
import { supabase } from "@/integrations/supabase/client";
import type {
  AgendamentoRow,
  ConteudoBloco,
  FotoGaleriaRow,
  NovaReserva,
  UsuarioAdmin,
  VeiculoFrotaRow,
} from "@/lib/dados-tipos";
import { contarReservasMesmoCarroData } from "@/lib/disponibilidade.functions";
import { ROTA_COLUMNS, type RotaRow } from "@/lib/rotasMap";
import {
  definirPapelAdmin,
  definirPapelMotorista,
  listUsuarios,
  redefinirSenhaUsuario,
} from "@/lib/usuarios.functions";
import { MODO_VPS } from "@/lib/vps/config";
import { sessaoAtual } from "@/lib/vps/sessao.functions";
import {
  vpsAtribuirMotorista,
  vpsAtualizarStatus,
  vpsCancelarMinhaViagem,
  vpsConcluirCorrida,
  vpsContarMesmoCarroData,
  vpsCriarBloco,
  vpsCriarFotoGaleria,
  vpsCriarReservas,
  vpsCriarRota,
  vpsCriarVeiculoFrota,
  vpsDefinirAdmin,
  vpsDefinirMotorista,
  vpsListAgendamentos,
  vpsListConteudoAdmin,
  vpsListFrotaGaleriaAdmin,
  vpsListFrotaVeiculosAdmin,
  vpsListRotasAdmin,
  vpsListUsuarios,
  vpsMinhasCorridas,
  vpsMinhasViagens,
  vpsRedefinirSenha,
  vpsRemoverAgendamento,
  vpsRemoverBloco,
  vpsRemoverFotoGaleria,
  vpsRemoverRota,
  vpsRemoverVeiculoFrota,
  vpsSalvarBloco,
  vpsSalvarFotoGaleria,
  vpsSalvarRota,
  vpsSalvarVeiculoFrota,
} from "@/lib/vps/dados.functions";
import {
  vpsAtribuirMotoristaPedido,
  vpsAtualizarCanalVenda,
  vpsAtualizarCategoriaVeiculo,
  vpsAtualizarEmpresaCliente,
  vpsCriarCanalVenda,
  vpsCriarCategoriaVeiculo,
  vpsCriarEmpresaCliente,
  vpsCriarMotorista,
  vpsCriarPedido,
  vpsImportarPedidos,
  vpsListarCanaisVenda,
  vpsListarCategoriasVeiculo,
  vpsListarEmpresasClientes,
  vpsListarFornecedores,
  vpsListarPedidosAdmin,
  vpsListarPedidosMotorista,
  vpsMeuFornecedor,
  vpsPedidoDetalheAdmin,
  vpsRemoverMotorista,
  vpsSalvarNotasFornecedor,
  vpsSalvarNotasInternas,
  vpsSalvarObservacaoMotorista,
  vpsTransicionarStatusPedido,
  vpsTransicionarStatusPedidoMotorista,
  vpsVerificarCodigosExistentes,
  type PedidoImportRow,
} from "@/lib/vps/dados-despacho.functions";

function erro(e: { message: string } | null): void {
  if (e) throw new Error(e.message);
}

// ------------------------------------------------------------------ rotas
export async function listarRotasAdmin(): Promise<RotaRow[]> {
  if (MODO_VPS) return vpsListRotasAdmin();
  const { data, error } = await supabase
    .from("rotas")
    .select(ROTA_COLUMNS)
    .order("popularidade", { ascending: false });
  erro(error);
  return (data ?? []) as unknown as RotaRow[];
}

export type NovaRotaInput = {
  slug: string;
  origem: string;
  destino: string;
  duracao: string;
  distancia: string;
  preco_pequeno: number;
  resumo: string;
};

export async function criarRota(input: NovaRotaInput): Promise<void> {
  if (MODO_VPS) {
    await vpsCriarRota({ data: input });
    return;
  }
  const { error } = await supabase.from("rotas").insert({ ...input, ativo: false });
  erro(error);
}

export async function salvarRota(rota: RotaRow): Promise<void> {
  const campos = {
    origem: rota.origem,
    destino: rota.destino,
    duracao: rota.duracao,
    distancia: rota.distancia,
    preco_pequeno: Number(rota.preco_pequeno) || 0,
    preco_grande: rota.preco_grande === null ? null : Number(rota.preco_grande),
    preco_pequeno_noite:
      rota.preco_pequeno_noite === null ? null : Number(rota.preco_pequeno_noite),
    preco_grande_noite: rota.preco_grande_noite === null ? null : Number(rota.preco_grande_noite),
    destaque: rota.destaque || null,
    resumo: rota.resumo,
    descricao: rota.descricao,
    foto: rota.foto,
    galeria: rota.galeria,
    ativo: rota.ativo,
  };
  if (MODO_VPS) {
    await vpsSalvarRota({ data: { id: rota.id, ...campos } });
    return;
  }
  const { error } = await supabase.from("rotas").update(campos).eq("id", rota.id);
  erro(error);
}

export async function removerRota(id: string): Promise<void> {
  if (MODO_VPS) {
    await vpsRemoverRota({ data: { id } });
    return;
  }
  const { error } = await supabase.from("rotas").delete().eq("id", id);
  erro(error);
}

// ----------------------------------------------------------- agendamentos
export async function listarAgendamentos(): Promise<AgendamentoRow[]> {
  if (MODO_VPS) return vpsListAgendamentos();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .order("created_at", { ascending: false });
  erro(error);
  return (data ?? []) as AgendamentoRow[];
}

export async function listarMinhasViagens(userId: string): Promise<AgendamentoRow[]> {
  if (MODO_VPS) return vpsMinhasViagens();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  erro(error);
  return (data ?? []) as AgendamentoRow[];
}

/** Autoatendimento: o próprio cliente cancela uma reserva pendente/confirmada dele. */
export async function cancelarMinhaViagem(id: string, userId: string): Promise<void> {
  if (MODO_VPS) {
    await vpsCancelarMinhaViagem({ data: { id } });
    return;
  }
  const { data, error } = await supabase
    .from("agendamentos")
    .update({ status: "cancelado" })
    .eq("id", id)
    .eq("user_id", userId)
    .in("status", ["pendente", "confirmado"])
    .select("id");
  erro(error);
  if (!data?.length) {
    throw new Error("Não foi possível cancelar (reserva não encontrada ou já concluída).");
  }
}

export async function criarReservas(
  itens: NovaReserva[],
  userId: string,
): Promise<AgendamentoRow[]> {
  // Reforço no lado do servidor (não confiar só na validação do formulário):
  // sem WhatsApp válido a reserva não pode ser operacionalizada — ninguém
  // consegue avisar o cliente sobre o carro.
  for (const item of itens) {
    const digitos = (item.contato_telefone ?? "").replace(/\D/g, "");
    if (digitos.length < 10) {
      throw new Error("Informe um WhatsApp válido (com DDD) para finalizar a reserva.");
    }
  }
  // Trava contra reserva duplicada: mesma rota, data, horário e carro, ainda
  // ativa. Cobre tanto duplo-clique quanto reenviar o checkout depois de uma
  // resposta que falhou sem o cliente perceber que já tinha sido criada.
  const existentes = await listarMinhasViagens(userId);
  for (const item of itens) {
    const duplicada = existentes.find(
      (a) =>
        a.status !== "cancelado" &&
        a.rota_id === item.rota_id &&
        a.data_viagem === item.data_viagem &&
        a.hora === item.hora &&
        a.carro === item.carro,
    );
    if (duplicada) {
      throw new Error(
        `Você já tem uma reserva para "${item.trecho}" nessa data e horário — confira em Minhas viagens antes de reservar de novo.`,
      );
    }
  }

  if (MODO_VPS) return vpsCriarReservas({ data: { itens } });
  const { data, error } = await supabase
    .from("agendamentos")
    .insert(itens.map((i) => ({ ...i, user_id: userId })))
    .select("*");
  erro(error);
  return (data ?? []) as AgendamentoRow[];
}

/**
 * Quantas reservas ativas já existem pro mesmo carro nessa data — um aviso,
 * não uma trava: sem saber a duração exata de cada trecho, prefere alertar
 * a recusar uma reserva válida por engano.
 */
export async function contarConflitosPotenciais(
  carro: "pequeno" | "grande",
  data: string,
): Promise<number> {
  if (!data) return 0;
  if (MODO_VPS) return vpsContarMesmoCarroData({ data: { carro, data } });
  return contarReservasMesmoCarroData({ data: { carro, data } });
}

export async function atualizarStatusAgendamento(id: string, status: string): Promise<void> {
  if (MODO_VPS) {
    await vpsAtualizarStatus({
      data: { id, status: status as "pendente" | "confirmado" | "concluido" | "cancelado" },
    });
    return;
  }
  const { error } = await supabase.from("agendamentos").update({ status }).eq("id", id);
  erro(error);
}

export async function removerAgendamento(id: string): Promise<void> {
  if (MODO_VPS) {
    await vpsRemoverAgendamento({ data: { id } });
    return;
  }
  const { error } = await supabase.from("agendamentos").delete().eq("id", id);
  erro(error);
}

/** Admin atribui (ou remove, com `motoristaId: null`) um motorista a um agendamento. */
export async function atribuirMotorista(
  agendamentoId: string,
  motoristaId: string | null,
): Promise<void> {
  if (MODO_VPS) {
    await vpsAtribuirMotorista({ data: { id: agendamentoId, motoristaId } });
    return;
  }
  const { error } = await supabase
    .from("agendamentos")
    .update({ motorista_id: motoristaId })
    .eq("id", agendamentoId);
  erro(error);
}

export async function listarCorridasMotorista(motoristaId: string): Promise<AgendamentoRow[]> {
  if (MODO_VPS) return vpsMinhasCorridas();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*")
    .eq("motorista_id", motoristaId)
    .order("created_at", { ascending: false });
  erro(error);
  return (data ?? []) as AgendamentoRow[];
}

/** Autoatendimento: o motorista marca como concluída uma corrida confirmada e atribuída a ele. */
export async function concluirCorridaComoMotorista(id: string, motoristaId: string): Promise<void> {
  if (MODO_VPS) {
    await vpsConcluirCorrida({ data: { id } });
    return;
  }
  const { data, error } = await supabase
    .from("agendamentos")
    .update({ status: "concluido" })
    .eq("id", id)
    .eq("motorista_id", motoristaId)
    .eq("status", "confirmado")
    .select("id");
  erro(error);
  if (!data?.length) {
    throw new Error("Não foi possível concluir (corrida não encontrada ou não confirmada).");
  }
}

// -------------------------------------------------------------- conteúdo
export async function listarConteudoAdmin(): Promise<ConteudoBloco[]> {
  if (MODO_VPS) return vpsListConteudoAdmin();
  const { data, error } = await supabase
    .from("conteudo_site")
    .select("id, chave, secao, titulo, texto, imagem, ordem")
    .order("ordem", { ascending: true });
  erro(error);
  return (data ?? []) as ConteudoBloco[];
}

export async function criarBlocoConteudo(chave: string): Promise<void> {
  if (MODO_VPS) {
    await vpsCriarBloco({ data: { chave } });
    return;
  }
  const { error } = await supabase.from("conteudo_site").insert({ chave, secao: "geral" });
  erro(error);
}

export async function salvarBlocoConteudo(bloco: ConteudoBloco): Promise<void> {
  const campos = {
    titulo: bloco.titulo,
    texto: bloco.texto,
    imagem: bloco.imagem,
    ordem: Number(bloco.ordem) || 0,
  };
  if (MODO_VPS) {
    await vpsSalvarBloco({ data: { id: bloco.id, ...campos } });
    return;
  }
  const { error } = await supabase.from("conteudo_site").update(campos).eq("id", bloco.id);
  erro(error);
}

export async function removerBlocoConteudo(id: string): Promise<void> {
  if (MODO_VPS) {
    await vpsRemoverBloco({ data: { id } });
    return;
  }
  const { error } = await supabase.from("conteudo_site").delete().eq("id", id);
  erro(error);
}

// ---------------------------------------------------------------- frota
// Só existe o ramo VPS por enquanto: o cliente Supabase tipado usado aqui
// (createClient<Database>) só aceita nomes de tabela que já estão em
// src/integrations/supabase/types.ts, e esse arquivo só é regenerado pelo
// pipeline do Lovable depois que supabase/migrations/20260907010000_frota.sql
// for de fato aplicada — não dá pra escrever supabase.from("frota_veiculos")
// sem quebrar o typecheck antes disso. A aba "Frota" do admin fica escondida
// fora de MODO_VPS (ver admin.tsx) até esse ramo existir. A LEITURA pública
// (frota.functions.ts) já funciona nos dois backends desde já — usa um
// cliente Supabase avulso, sem essa trava de tipos.
export type NovoVeiculoInput = {
  nome: string;
  modelo: string;
  passageiros: string;
  bagagem: string;
  foto: string;
  itens: string[];
  ordem: number;
};

export async function listarFrotaVeiculosAdmin(): Promise<VeiculoFrotaRow[]> {
  if (MODO_VPS) return vpsListFrotaVeiculosAdmin();
  throw new Error("Edição de frota ainda não disponível neste ambiente.");
}

export async function criarVeiculoFrota(input: NovoVeiculoInput): Promise<void> {
  if (MODO_VPS) {
    await vpsCriarVeiculoFrota({ data: input });
    return;
  }
  throw new Error("Edição de frota ainda não disponível neste ambiente.");
}

export async function salvarVeiculoFrota(veiculo: VeiculoFrotaRow): Promise<void> {
  if (MODO_VPS) {
    await vpsSalvarVeiculoFrota({ data: veiculo });
    return;
  }
  throw new Error("Edição de frota ainda não disponível neste ambiente.");
}

export async function removerVeiculoFrota(id: string): Promise<void> {
  if (MODO_VPS) {
    await vpsRemoverVeiculoFrota({ data: { id } });
    return;
  }
  throw new Error("Edição de frota ainda não disponível neste ambiente.");
}

export type NovaFotoGaleriaInput = { foto: string; alt: string; ordem: number };

export async function listarFrotaGaleriaAdmin(): Promise<FotoGaleriaRow[]> {
  if (MODO_VPS) return vpsListFrotaGaleriaAdmin();
  throw new Error("Edição de frota ainda não disponível neste ambiente.");
}

export async function criarFotoGaleria(input: NovaFotoGaleriaInput): Promise<void> {
  if (MODO_VPS) {
    await vpsCriarFotoGaleria({ data: input });
    return;
  }
  throw new Error("Edição de frota ainda não disponível neste ambiente.");
}

export async function salvarFotoGaleria(foto: FotoGaleriaRow): Promise<void> {
  if (MODO_VPS) {
    await vpsSalvarFotoGaleria({ data: foto });
    return;
  }
  throw new Error("Edição de frota ainda não disponível neste ambiente.");
}

export async function removerFotoGaleria(id: string): Promise<void> {
  if (MODO_VPS) {
    await vpsRemoverFotoGaleria({ data: { id } });
    return;
  }
  throw new Error("Edição de frota ainda não disponível neste ambiente.");
}

// -------------------------------------------------------------- despacho
// Portado do car-fleet-co (Etapa 6 do roteiro da fusão). Domínio inteiro
// VPS-only por enquanto — mesmo motivo de frota acima: essas tabelas não
// existem no lado Supabase, então não há ramo Supabase pra escrever aqui.
export type FiltroPedidosAdmin = {
  codigo?: string;
  canal?: string;
  status?: string;
  empresa?: string;
  fornecedor?: string;
  direcao?: "IN" | "OUT";
  passageiro?: string;
  cidade?: string;
  tipoData?: "atividade" | "emissao" | "alteracao";
  de?: string;
  ate?: string;
};

export async function listarPedidosAdmin(filtro: FiltroPedidosAdmin = {}) {
  if (MODO_VPS) return vpsListarPedidosAdmin({ data: filtro });
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function pedidoDetalheAdmin(id: number) {
  if (MODO_VPS) return vpsPedidoDetalheAdmin({ data: { id } });
  throw new Error("Despacho ainda não disponível neste ambiente.");
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
  observacoes_internas?: string;
};

export async function criarPedido(input: NovoPedidoInput) {
  if (MODO_VPS) return vpsCriarPedido({ data: input });
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

/** Transiciona o status de uma corrida (regra em pedidos-transicoes.ts, validada de novo no servidor). */
export async function transicionarStatusPedido(pedidoId: number, novoStatus: string) {
  if (MODO_VPS) return vpsTransicionarStatusPedido({ data: { pedidoId, novoStatus } });
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

/** Atribui (ou remove, com `fornecedorId: null`) o motorista de uma corrida. */
export async function atribuirMotoristaPedido(pedidoId: number, fornecedorId: string | null) {
  if (MODO_VPS) return vpsAtribuirMotoristaPedido({ data: { pedidoId, fornecedorId } });
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

/** Observações internas da corrida — nunca visíveis pro motorista, só pro admin. */
export async function salvarNotasInternas(pedidoId: number, texto: string): Promise<void> {
  if (MODO_VPS) {
    await vpsSalvarNotasInternas({ data: { pedidoId, texto } });
    return;
  }
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

// -------------------------------------------------------- painel do motorista
// (modelo despacho: fornecedores + pedidos.fornecedor_id — Etapa 9 do
// roteiro da fusão). VPS-only, como o resto do despacho. Distinto de
// meuFornecedor/listarCorridasMotorista mais abaixo, que são o modelo
// antigo (agendamentos.motorista_id) — mantido funcionando nos dois
// backends pra não regredir o pouco uso que já existisse lá.
export async function meuFornecedor(): Promise<{
  id: string;
  nome: string;
  telefone: string | null;
  cidade_atuacao: string;
  email: string;
} | null> {
  if (MODO_VPS) return vpsMeuFornecedor();
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function listarPedidosMotorista() {
  if (MODO_VPS) return vpsListarPedidosMotorista();
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function transicionarStatusPedidoMotorista(pedidoId: number, novoStatus: string) {
  if (MODO_VPS) return vpsTransicionarStatusPedidoMotorista({ data: { pedidoId, novoStatus } });
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function salvarObservacaoMotorista(pedidoId: number, texto: string): Promise<void> {
  if (MODO_VPS) {
    await vpsSalvarObservacaoMotorista({ data: { pedidoId, texto } });
    return;
  }
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function listarCategoriasVeiculo() {
  if (MODO_VPS) return vpsListarCategoriasVeiculo();
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function criarCategoriaVeiculo(
  nome: string,
  capacidade_passageiros: number | null,
): Promise<void> {
  if (MODO_VPS) {
    await vpsCriarCategoriaVeiculo({ data: { nome, capacidade_passageiros } });
    return;
  }
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function atualizarCategoriaVeiculo(
  id: string,
  campos: { nome: string; capacidade_passageiros: number | null } | { ativo: boolean },
): Promise<void> {
  if (MODO_VPS) {
    await vpsAtualizarCategoriaVeiculo({
      data:
        "ativo" in campos
          ? { id, ativo: campos.ativo, nome: "", capacidade_passageiros: null }
          : { id, ...campos },
    });
    return;
  }
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function listarEmpresasClientes() {
  if (MODO_VPS) return vpsListarEmpresasClientes();
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function criarEmpresaCliente(campos: {
  nome: string;
  documento: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
}): Promise<void> {
  if (MODO_VPS) {
    await vpsCriarEmpresaCliente({ data: campos });
    return;
  }
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function atualizarEmpresaCliente(
  id: string,
  campos:
    | {
        nome: string;
        documento: string | null;
        email_contato: string | null;
        telefone_contato: string | null;
      }
    | { ativo: boolean },
): Promise<void> {
  if (MODO_VPS) {
    await vpsAtualizarEmpresaCliente({
      data:
        "ativo" in campos
          ? {
              id,
              ativo: campos.ativo,
              nome: "",
              documento: null,
              email_contato: null,
              telefone_contato: null,
            }
          : { id, ...campos },
    });
    return;
  }
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function listarCanaisVenda() {
  if (MODO_VPS) return vpsListarCanaisVenda();
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function criarCanalVenda(
  nome: string,
  tipo: "ota" | "site_proprio" | "parceiro" | "outro",
): Promise<void> {
  if (MODO_VPS) {
    await vpsCriarCanalVenda({ data: { nome, tipo } });
    return;
  }
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function atualizarCanalVenda(
  id: string,
  campos:
    { nome: string; tipo: "ota" | "site_proprio" | "parceiro" | "outro" } | { ativo: boolean },
): Promise<void> {
  if (MODO_VPS) {
    await vpsAtualizarCanalVenda({
      data:
        "ativo" in campos
          ? { id, ativo: campos.ativo, nome: "", tipo: "outro" }
          : { id, ...campos },
    });
    return;
  }
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

// -------------------------------------------------------- fornecedores (motoristas)
export type Fornecedor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade_atuacao: string;
  categoria_veiculo_id: string | null;
  ativo: boolean;
  observacoes_internas: string | null;
};

export async function listarFornecedores(): Promise<Fornecedor[]> {
  if (MODO_VPS) return vpsListarFornecedores();
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

/** Observações internas do motorista (nunca visíveis pra ele, só pro admin). */
export async function salvarNotasFornecedor(fornecedorId: string, texto: string): Promise<void> {
  if (MODO_VPS) {
    await vpsSalvarNotasFornecedor({ data: { fornecedorId, texto } });
    return;
  }
  throw new Error("Despacho ainda não disponível neste ambiente.");
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

/** Cria login + cadastro de fornecedor numa transação só (ver vpsCriarMotorista). */
export async function criarNovoMotorista(input: NovoMotoristaInput) {
  if (MODO_VPS) return vpsCriarMotorista({ data: input });
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

/** Remove o motorista, ou — se ele já tiver corridas no histórico — só desativa e revoga o login. */
export async function removerCadastroMotorista(
  fornecedorId: string,
): Promise<{ desativado: boolean; removido: boolean }> {
  if (MODO_VPS) return vpsRemoverMotorista({ data: { fornecedorId } });
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

// ---------------------------------------------------- importação de pedidos
export async function verificarCodigosExistentes(codigos: string[]): Promise<string[]> {
  if (MODO_VPS) return vpsVerificarCodigosExistentes({ data: { codigos } });
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

export async function importarPedidos(
  rows: PedidoImportRow[],
): Promise<{ inseridos: number; ignorados: number }> {
  if (MODO_VPS) return vpsImportarPedidos({ data: { rows } });
  throw new Error("Despacho ainda não disponível neste ambiente.");
}

// ------------------------------------------------------ usuários e acessos
export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  return MODO_VPS ? vpsListUsuarios() : listUsuarios();
}

export async function definirAdmin(userId: string, admin: boolean): Promise<void> {
  if (MODO_VPS) {
    await vpsDefinirAdmin({ data: { userId, admin } });
    return;
  }
  await definirPapelAdmin({ data: { userId, admin } });
}

export async function definirMotorista(userId: string, motorista: boolean): Promise<void> {
  if (MODO_VPS) {
    await vpsDefinirMotorista({ data: { userId, motorista } });
    return;
  }
  await definirPapelMotorista({ data: { userId, motorista } });
}

export async function redefinirSenha(userId: string, senha: string): Promise<void> {
  if (MODO_VPS) {
    await vpsRedefinirSenha({ data: { userId, senha } });
    return;
  }
  await redefinirSenhaUsuario({ data: { userId, senha } });
}

// ---------------------------------------------------------------- imagens
/** Envia uma foto e devolve a URL pública (disco da VPS ou storage do Cloud). */
export async function enviarImagem(arquivo: File, prefixo: string): Promise<string> {
  if (MODO_VPS) {
    const corpo = new FormData();
    corpo.append("arquivo", arquivo);
    const resposta = await fetch("/api/uploads", { method: "POST", body: corpo });
    if (!resposta.ok) throw new Error("Falha ao enviar a foto.");
    const json = (await resposta.json()) as { url?: string; erro?: string };
    if (!json.url) throw new Error(json.erro ?? "Falha ao enviar a foto.");
    return json.url;
  }
  const caminho = `${prefixo}/${Date.now()}-${arquivo.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from("rotas").upload(caminho, arquivo);
  erro(error);
  const { data, error: erroUrl } = await supabase.storage
    .from("rotas")
    .createSignedUrl(caminho, 60 * 60 * 24 * 365 * 20);
  if (erroUrl || !data) throw erroUrl ?? new Error("Falha ao gerar link da imagem.");
  return data.signedUrl;
}

// ------------------------------------------------------------------ perfil
/** Nome/telefone salvos do cliente, para pré-preencher o checkout. */
export async function perfilContato(
  userId: string,
): Promise<{ nome: string | null; telefone: string | null } | null> {
  if (MODO_VPS) {
    const sessao = await sessaoAtual();
    return sessao ? { nome: sessao.nome || null, telefone: sessao.telefone || null } : null;
  }
  const { data } = await supabase
    .from("profiles")
    .select("nome,telefone")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}
