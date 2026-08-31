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
