// Registro mínimo de auditoria para ações administrativas sensíveis
// (promover/remover admin, redefinir senha de outra conta). Enquanto não
// há acesso pra criar uma tabela de verdade visível no painel (mesmo
// bloqueio de acesso a schema já sinalizado pra outras mudanças), isto
// pelo menos deixa rastro nos logs do servidor — painel do Cloudflare
// Worker no Lovable, `docker compose logs`/journalctl na VPS. Uma linha
// JSON por evento, fácil de filtrar (`grep auditoria_admin`).
export function registrarAuditoria(evento: {
  acao: string;
  atorId: string;
  atorEmail?: string | null | undefined;
  alvoId: string;
  detalhe?: string | undefined;
}) {
  console.log(
    JSON.stringify({
      tipo: "auditoria_admin",
      timestamp: new Date().toISOString(),
      ...evento,
    }),
  );
}

// ------------------------------------------------------------------------
// Trilha persistida (tabela public.auditoria, migration 0012) — só o lado
// puro fica aqui (client-safe, testável). A gravação em si é
// src/lib/vps/auditoria.server.ts.

export type AtorAuditoria = { id: string; email: string };

export type EventoAuditoria = {
  acao: string;
  entidade: string;
  entidadeId?: string | number | null | undefined;
  resumo: string;
  antes?: Record<string, unknown> | null | undefined;
  depois?: Record<string, unknown> | null | undefined;
};

const LIMITE_VALOR = 300;

function normalizar(valor: unknown): unknown {
  if (valor === undefined) return null;
  if (typeof valor === "string" && valor.length > LIMITE_VALOR) {
    return `${valor.slice(0, LIMITE_VALOR)}… (+${String(valor.length - LIMITE_VALOR)} caracteres)`;
  }
  return valor;
}

/** Só os campos que de fato mudaram, no formato `{ antes, depois }` — o que
 * vai pras colunas jsonb da tabela. Textos longos (descrição de rota,
 * corpo de bloco de conteúdo) são cortados: a trilha diz QUE mudou e o
 * começo do valor, não vira uma cópia do banco. Comparação por JSON, então
 * arrays (galeria de fotos) funcionam sem tratamento à parte. */
export function diferencaCampos(
  antes: Record<string, unknown>,
  depois: Record<string, unknown>,
  campos: readonly string[],
): { antes: Record<string, unknown>; depois: Record<string, unknown> } {
  const a: Record<string, unknown> = {};
  const d: Record<string, unknown> = {};
  for (const campo of campos) {
    const valorAntes = antes[campo] ?? null;
    const valorDepois = depois[campo] ?? null;
    if (JSON.stringify(valorAntes) === JSON.stringify(valorDepois)) continue;
    a[campo] = normalizar(valorAntes);
    d[campo] = normalizar(valorDepois);
  }
  return { antes: a, depois: d };
}

/** true se `diferencaCampos` não achou nenhuma mudança — pra não gravar
 * evento de "editou" quando o admin clicou em Salvar sem alterar nada. */
export function semMudancas(diff: { antes: Record<string, unknown> }): boolean {
  return Object.keys(diff.antes).length === 0;
}
