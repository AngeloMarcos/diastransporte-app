// Camada de dados do app: as telas chamam SEMPRE estas funções, nunca o backend
// direto. Cada uma cai numa server function de src/lib/vps/* (Postgres próprio;
// autorização feita no servidor). Antes da migração havia um segundo ramo, para o
// Lovable Cloud (Supabase + RLS) — removido quando o Lovable foi desligado.
import { otimizarImagem } from "@/lib/imagem";
import type { LeadRow, LeadStatus, NovoLead } from "@/lib/leads";
import type {
  AgendamentoRow,
  AuditoriaRow,
  ConteudoBloco,
  FotoGaleriaRow,
  NovaReserva,
  UsuarioAdmin,
  VeiculoFrotaRow,
} from "@/lib/dados-tipos";
import { hojeEmMaranhao } from "@/lib/fuso-maranhao";
import { HORA_REGEX } from "@/lib/periodo";
import type { RotaRow } from "@/lib/rotasMap";
import { sessaoAtual } from "@/lib/vps/sessao.functions";
import {
  vpsAtualizarStatus,
  vpsCancelarMinhaViagem,
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
  vpsListarAuditoria,
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
import { vpsAtualizarLead, vpsCriarLead, vpsListarLeads } from "@/lib/vps/leads.functions";
import {
  vpsAtribuirMotoristaPedido,
  vpsAtualizarCanalVenda,
  vpsAtualizarCategoriaVeiculo,
  vpsAtualizarEmpresaCliente,
  vpsAtualizarPedido,
  vpsCriarCanalVenda,
  vpsCriarCategoriaVeiculo,
  vpsCriarEmpresaCliente,
  vpsCriarMotorista,
  vpsGerarConviteMotorista,
  vpsCriarPedido,
  vpsImportarPedidos,
  vpsListarCanaisVenda,
  vpsListarCategoriasVeiculo,
  vpsListarEmpresasClientes,
  vpsDashboardDespacho,
  vpsListarFornecedores,
  vpsListarPedidosAdmin,
  vpsListarPedidosMotorista,
  vpsMeuFornecedor,
  vpsPedidoDetalheAdmin,
  vpsReativarMotorista,
  vpsRemoverMotorista,
  vpsSalvarNotasFornecedor,
  vpsSalvarNotasInternas,
  vpsSalvarObservacaoMotorista,
  vpsTransicionarStatusPedido,
  vpsTransicionarStatusPedidoMotorista,
  vpsVerificarCodigosExistentes,
  type PedidoImportRow,
} from "@/lib/vps/dados-despacho.functions";

// ------------------------------------------------------------------ rotas
export async function listarRotasAdmin(): Promise<RotaRow[]> {
  return vpsListRotasAdmin();
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
  await vpsCriarRota({ data: input });
}

export async function salvarRota(rota: RotaRow): Promise<void> {
  const campos = {
    origem: rota.origem,
    destino: rota.destino,
    duracao: rota.duracao,
    distancia: rota.distancia,
    // Sprint 3: antes só dava pra editar estes campos no banco — o admin não
    // conseguia marcar "somente ida", listar os locais de embarque nem mexer
    // na ordem de "mais pedidos".
    ida_e_volta: rota.ida_e_volta,
    embarque: rota.embarque,
    popularidade: Number(rota.popularidade) || 0,
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
  await vpsSalvarRota({ data: { id: rota.id, ...campos } });
}

export async function removerRota(id: string): Promise<void> {
  await vpsRemoverRota({ data: { id } });
}

// ----------------------------------------------------------- agendamentos
export async function listarAgendamentos(): Promise<AgendamentoRow[]> {
  return vpsListAgendamentos();
}

export async function listarMinhasViagens(): Promise<AgendamentoRow[]> {
  return vpsMinhasViagens();
}

/** Autoatendimento: o próprio cliente cancela uma reserva pendente/confirmada dele. */
export async function cancelarMinhaViagem(id: string): Promise<void> {
  await vpsCancelarMinhaViagem({ data: { id } });
}

export async function criarReservas(itens: NovaReserva[]): Promise<AgendamentoRow[]> {
  // Reforço no lado do servidor (não confiar só na validação do formulário):
  // sem WhatsApp válido a reserva não pode ser operacionalizada — ninguém
  // consegue avisar o cliente sobre o carro.
  for (const item of itens) {
    const digitos = (item.contato_telefone ?? "").replace(/\D/g, "");
    if (digitos.length < 10) {
      throw new Error("Informe um WhatsApp válido (com DDD) para finalizar a reserva.");
    }
    // Sprint 2 (auditoria do site, A3): a tarifa dia/noite sai do horário, e
    // item antigo de carrinho (de antes de o horário ser obrigatório) pode
    // não ter — pede pra refazer em vez de deixar o servidor rejeitar com
    // mensagem técnica.
    if (!item.hora || !HORA_REGEX.test(item.hora)) {
      throw new Error(
        `Falta o horário de "${item.trecho}" — o valor depende dele (tarifa noturna das 18h às 5h). Remova o item e adicione de novo com o horário.`,
      );
    }
    if (!item.data_viagem || item.data_viagem < hojeEmMaranhao()) {
      throw new Error(
        `A data de "${item.trecho}" já passou ou não foi informada — remova o item e adicione de novo.`,
      );
    }
  }
  // Trava contra reserva duplicada: mesma rota, data, horário e carro, ainda
  // ativa. Cobre tanto duplo-clique quanto reenviar o checkout depois de uma
  // resposta que falhou sem o cliente perceber que já tinha sido criada.
  const existentes = await listarMinhasViagens();
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

  return vpsCriarReservas({ data: { itens } });
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
  return vpsContarMesmoCarroData({ data: { carro, data } });
}

export async function atualizarStatusAgendamento(id: string, status: string): Promise<void> {
  await vpsAtualizarStatus({
    data: { id, status: status as "pendente" | "confirmado" | "concluido" | "cancelado" },
  });
}

export async function removerAgendamento(id: string): Promise<void> {
  await vpsRemoverAgendamento({ data: { id } });
}

// -------------------------------------------------------------- conteúdo
export async function listarConteudoAdmin(): Promise<ConteudoBloco[]> {
  return vpsListConteudoAdmin();
}

export async function criarBlocoConteudo(chave: string): Promise<void> {
  await vpsCriarBloco({ data: { chave } });
}

export async function salvarBlocoConteudo(bloco: ConteudoBloco): Promise<void> {
  await vpsSalvarBloco({
    data: {
      id: bloco.id,
      titulo: bloco.titulo,
      texto: bloco.texto,
      imagem: bloco.imagem,
      ordem: Number(bloco.ordem) || 0,
    },
  });
}

export async function removerBlocoConteudo(id: string): Promise<void> {
  await vpsRemoverBloco({ data: { id } });
}

// ---------------------------------------------------------------- frota
export type NovoVeiculoInput = {
  nome: string;
  modelo: string;
  categoria: "pequeno" | "grande" | null;
  capacidade_passageiros: number | null;
  malas: number | null;
  placa: string | null;
  foto: string;
  itens: string[];
  ordem: number;
};

export async function listarFrotaVeiculosAdmin(): Promise<VeiculoFrotaRow[]> {
  return vpsListFrotaVeiculosAdmin();
}

export async function criarVeiculoFrota(input: NovoVeiculoInput): Promise<void> {
  await vpsCriarVeiculoFrota({ data: input });
}

export async function salvarVeiculoFrota(veiculo: VeiculoFrotaRow): Promise<void> {
  await vpsSalvarVeiculoFrota({ data: veiculo });
}

export async function removerVeiculoFrota(id: string): Promise<void> {
  await vpsRemoverVeiculoFrota({ data: { id } });
}

export type NovaFotoGaleriaInput = { foto: string; alt: string; ordem: number };

export async function listarFrotaGaleriaAdmin(): Promise<FotoGaleriaRow[]> {
  return vpsListFrotaGaleriaAdmin();
}

export async function criarFotoGaleria(input: NovaFotoGaleriaInput): Promise<void> {
  await vpsCriarFotoGaleria({ data: input });
}

export async function salvarFotoGaleria(foto: FotoGaleriaRow): Promise<void> {
  await vpsSalvarFotoGaleria({ data: foto });
}

export async function removerFotoGaleria(id: string): Promise<void> {
  await vpsRemoverFotoGaleria({ data: { id } });
}

// -------------------------------------------------------------- despacho
// Portado do car-fleet-co (Etapa 6 do roteiro da fusão).
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
  return vpsListarPedidosAdmin({ data: filtro });
}

/** Resumo do despacho pra "Visão geral": contagem por status, corridas de
 * hoje e corridas sem motorista atribuído. Equivalente ao dashboard próprio
 * que o car-fleet-co tinha antes da fusão. */
export async function dashboardDespacho() {
  return vpsDashboardDespacho();
}

export async function pedidoDetalheAdmin(id: number) {
  return vpsPedidoDetalheAdmin({ data: { id } });
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
  return vpsCriarPedido({ data: input });
}

// Edição completa de um pedido já existente (achado revisando UX: só dava
// pra mudar status/motorista/observações depois de criado — um erro de
// digitação em qualquer outro campo não tinha conserto sem apagar e
// recriar, perdendo o histórico). Deliberadamente sem status/fornecedor_id
// aqui — ver comentário em vpsAtualizarPedido sobre por que esses dois
// continuam só pelas mutações dedicadas.
export type EdicaoPedidoInput = Omit<NovoPedidoInput, "observacoes_internas"> & {
  id: number;
  codigo_fornecedor_reserva: string | null;
};

export async function atualizarPedido(input: EdicaoPedidoInput) {
  return vpsAtualizarPedido({ data: input });
}

/** Transiciona o status de uma corrida (regra em pedidos-transicoes.ts, validada de novo no servidor). */
export async function transicionarStatusPedido(pedidoId: number, novoStatus: string) {
  return vpsTransicionarStatusPedido({ data: { pedidoId, novoStatus } });
}

/** Atribui (ou remove, com `fornecedorId: null`) o motorista de uma corrida. */
export async function atribuirMotoristaPedido(pedidoId: number, fornecedorId: string | null) {
  return vpsAtribuirMotoristaPedido({ data: { pedidoId, fornecedorId } });
}

/** Observações internas da corrida — nunca visíveis pro motorista, só pro admin. */
export async function salvarNotasInternas(pedidoId: number, texto: string): Promise<void> {
  await vpsSalvarNotasInternas({ data: { pedidoId, texto } });
}

// -------------------------------------------------------- painel do motorista
// (modelo despacho: fornecedores + pedidos.fornecedor_id — Etapa 9 do
// roteiro da fusão). VPS-only, como o resto do despacho. Distinto de
export async function meuFornecedor(): Promise<{
  id: string;
  nome: string;
  telefone: string | null;
  cidade_atuacao: string;
  email: string;
} | null> {
  return vpsMeuFornecedor();
}

export async function listarPedidosMotorista() {
  return vpsListarPedidosMotorista();
}

export async function transicionarStatusPedidoMotorista(pedidoId: number, novoStatus: string) {
  return vpsTransicionarStatusPedidoMotorista({ data: { pedidoId, novoStatus } });
}

export async function salvarObservacaoMotorista(pedidoId: number, texto: string): Promise<void> {
  await vpsSalvarObservacaoMotorista({ data: { pedidoId, texto } });
}

export async function listarCategoriasVeiculo() {
  return vpsListarCategoriasVeiculo();
}

export async function criarCategoriaVeiculo(
  nome: string,
  capacidade_passageiros: number | null,
): Promise<void> {
  await vpsCriarCategoriaVeiculo({ data: { nome, capacidade_passageiros } });
}

export async function atualizarCategoriaVeiculo(
  id: string,
  campos: { nome: string; capacidade_passageiros: number | null } | { ativo: boolean },
): Promise<void> {
  await vpsAtualizarCategoriaVeiculo({
    data:
      "ativo" in campos
        ? { id, ativo: campos.ativo, nome: "", capacidade_passageiros: null }
        : { id, ...campos },
  });
}

export async function listarEmpresasClientes() {
  return vpsListarEmpresasClientes();
}

export async function criarEmpresaCliente(campos: {
  nome: string;
  documento: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
}): Promise<void> {
  await vpsCriarEmpresaCliente({ data: campos });
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
}

export async function listarCanaisVenda() {
  return vpsListarCanaisVenda();
}

export async function criarCanalVenda(
  nome: string,
  tipo: "ota" | "site_proprio" | "parceiro" | "outro",
): Promise<void> {
  await vpsCriarCanalVenda({ data: { nome, tipo } });
}

export async function atualizarCanalVenda(
  id: string,
  campos:
    { nome: string; tipo: "ota" | "site_proprio" | "parceiro" | "outro" } | { ativo: boolean },
): Promise<void> {
  await vpsAtualizarCanalVenda({
    data:
      "ativo" in campos ? { id, ativo: campos.ativo, nome: "", tipo: "outro" } : { id, ...campos },
  });
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
  return vpsListarFornecedores();
}

/** Observações internas do motorista (nunca visíveis pra ele, só pro admin). */
export async function salvarNotasFornecedor(fornecedorId: string, texto: string): Promise<void> {
  await vpsSalvarNotasFornecedor({ data: { fornecedorId, texto } });
}

export type NovoMotoristaInput = {
  nome: string;
  email: string;
  telefone: string;
  cidade_atuacao: string;
  regiao_atuacao: string;
  categoria_veiculo_id?: string | null;
  observacoes_internas: string;
};

/** Cria login + cadastro de fornecedor numa transação só (ver vpsCriarMotorista). */
export async function criarNovoMotorista(input: NovoMotoristaInput) {
  return vpsCriarMotorista({ data: input });
}

/** Link de acesso novo pro motorista (convite inicial perdido ou "esqueci minha senha"). */
export async function gerarConviteMotorista(fornecedorId: string) {
  return vpsGerarConviteMotorista({ data: { fornecedorId } });
}

/** Remove o motorista, ou — se ele já tiver corridas no histórico — só desativa e revoga o login. */
export async function removerCadastroMotorista(
  fornecedorId: string,
): Promise<{ desativado: boolean; removido: boolean }> {
  return vpsRemoverMotorista({ data: { fornecedorId } });
}

/** Cria um login novo pra um fornecedor desativado, reativando o cadastro
 * (ver vpsReativarMotorista — o usuário original foi apagado, não dá pra
 * só virar um boolean de volta). */
export async function reativarMotorista(fornecedorId: string, email: string, senha: string) {
  return vpsReativarMotorista({ data: { fornecedorId, email, senha } });
}

// ---------------------------------------------------- importação de pedidos
export async function verificarCodigosExistentes(codigos: string[]): Promise<string[]> {
  return vpsVerificarCodigosExistentes({ data: { codigos } });
}

export async function importarPedidos(
  rows: PedidoImportRow[],
): Promise<{ inseridos: number; ignorados: number }> {
  return vpsImportarPedidos({ data: { rows } });
}

// -------------------------------------------------------------- auditoria
export type FiltroAuditoria = {
  entidade?: string;
  busca?: string;
  limite?: number;
};

/** Trilha de auditoria das ações do admin (quem mudou o quê e quando).
 * VPS-only: a tabela nasce com a migration 0012 do Postgres da VPS. */
export async function listarAuditoria(filtro: FiltroAuditoria = {}): Promise<AuditoriaRow[]> {
  return vpsListarAuditoria({ data: filtro });
}
// ------------------------------------------------------------------ leads
/** Registra um pedido de orçamento do formulário de contato (público; a tela
 * trata falha como não-bloqueante, pois o WhatsApp já foi aberto). */
export async function criarLead(lead: NovoLead): Promise<{ salvo: boolean }> {
  await vpsCriarLead({ data: lead });
  return { salvo: true };
}

export async function listarLeads(
  filtro: { status?: LeadStatus; busca?: string } = {},
): Promise<LeadRow[]> {
  return vpsListarLeads({ data: filtro });
}

export async function atualizarLead(dados: {
  id: string;
  status?: LeadStatus;
  notaInterna?: string;
}): Promise<void> {
  await vpsAtualizarLead({ data: dados });
}

// ------------------------------------------------------ usuários e acessos
export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  return vpsListUsuarios();
}

export async function definirAdmin(userId: string, admin: boolean): Promise<void> {
  await vpsDefinirAdmin({ data: { userId, admin } });
}

export async function definirMotorista(userId: string, motorista: boolean): Promise<void> {
  await vpsDefinirMotorista({ data: { userId, motorista } });
}

export async function redefinirSenha(userId: string, senha: string): Promise<void> {
  await vpsRedefinirSenha({ data: { userId, senha } });
}

// ---------------------------------------------------------------- imagens
/** Envia uma foto (disco da VPS, via /api/uploads) e devolve a URL pública. */
export async function enviarImagem(original: File): Promise<string> {
  // Redimensiona e regrava em WebP (sem EXIF/GPS) antes de subir — ver lib/imagem.ts.
  const arquivo = await otimizarImagem(original);
  const corpo = new FormData();
  corpo.append("arquivo", arquivo);
  const resposta = await fetch("/api/uploads", { method: "POST", body: corpo });
  if (!resposta.ok) throw new Error("Falha ao enviar a foto.");
  const json = (await resposta.json()) as { url?: string; erro?: string };
  if (!json.url) throw new Error(json.erro ?? "Falha ao enviar a foto.");
  return json.url;
}

// ------------------------------------------------------------------ perfil
/** Nome/telefone salvos do cliente logado, para pré-preencher o checkout. */
export async function perfilContato(): Promise<{
  nome: string | null;
  telefone: string | null;
} | null> {
  const sessao = await sessaoAtual();
  return sessao ? { nome: sessao.nome || null, telefone: sessao.telefone || null } : null;
}
