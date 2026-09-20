// Gravação da trilha de auditoria (public.auditoria, migration 0012).
// Server-only.
import type { AtorAuditoria, EventoAuditoria } from "@/lib/auditoria";
import { sql } from "./db.server";

/** Grava um evento. Best-effort de propósito: a ação do admin já foi feita
 * quando isto roda (chamado DEPOIS do commit), então uma falha aqui vira um
 * log de erro — não pode transformar "salvei a rota" em "erro" na tela do
 * admin com a rota já alterada. Nunca receba senha, hash ou token em
 * `antes`/`depois`. */
export async function gravarAuditoria(ator: AtorAuditoria, ev: EventoAuditoria): Promise<void> {
  try {
    await sql()`
      INSERT INTO public.auditoria
        (usuario_id, usuario_email, acao, entidade, entidade_id, resumo, antes, depois)
      VALUES (${ator.id}, ${ator.email}, ${ev.acao}, ${ev.entidade},
              ${ev.entidadeId === undefined || ev.entidadeId === null ? null : String(ev.entidadeId)},
              ${ev.resumo.slice(0, 500)},
              ${ev.antes ? sql().json(ev.antes as never) : null},
              ${ev.depois ? sql().json(ev.depois as never) : null})
    `;
  } catch (erro) {
    console.error(
      JSON.stringify({
        tipo: "auditoria_falhou",
        acao: ev.acao,
        entidade: ev.entidade,
        erro: erro instanceof Error ? erro.message : String(erro),
      }),
    );
  }
}
