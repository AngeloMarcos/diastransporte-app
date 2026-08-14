// Adaptador de dados: as telas chamam SEMPRE estas funções, nunca o backend
// direto. Em MODO_VPS elas caem nas server functions de src/lib/vps/*; no
// Lovable Cloud seguem pelo cliente Supabase + RLS (comportamento atual).
// Quando o site estiver 100% na VPS, basta apagar os ramos "cloud" daqui.
import { supabase } from "@/integrations/supabase/client";
import type { AgendamentoRow, ConteudoBloco, NovaReserva, UsuarioAdmin } from "@/lib/dados-tipos";
import { ROTA_COLUMNS, type RotaRow } from "@/lib/rotasMap";
import { definirPapelAdmin, listUsuarios, redefinirSenhaUsuario } from "@/lib/usuarios.functions";
import { MODO_VPS } from "@/lib/vps/config";
import {
  vpsAtualizarStatus,
  vpsCriarBloco,
  vpsCriarReservas,
  vpsCriarRota,
  vpsDefinirAdmin,
  vpsListAgendamentos,
  vpsListConteudoAdmin,
  vpsListRotasAdmin,
  vpsListUsuarios,
  vpsMinhasViagens,
  vpsRedefinirSenha,
  vpsRemoverAgendamento,
  vpsRemoverBloco,
  vpsRemoverRota,
  vpsSalvarBloco,
  vpsSalvarRota,
} from "@/lib/vps/dados.functions";

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

export async function criarReservas(
  itens: NovaReserva[],
  userId: string,
): Promise<AgendamentoRow[]> {
  if (MODO_VPS) return vpsCriarReservas({ data: { itens } });
  const { data, error } = await supabase
    .from("agendamentos")
    .insert(itens.map((i) => ({ ...i, user_id: userId })))
    .select("*");
  erro(error);
  return (data ?? []) as AgendamentoRow[];
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
