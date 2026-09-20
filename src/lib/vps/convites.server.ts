// Convites de acesso (public.convites, migration 0016). Server-only.
import { randomBytes } from "crypto";

import { hashToken } from "./auth.server";
import { sql } from "./db.server";

export const VALIDADE_CONVITE_DIAS = 7;

/** Gera um convite novo pro usuário e devolve o TOKEN em texto — a única vez
 * que ele existe em claro (no banco fica só o hash). Convites anteriores
 * ainda não usados desse usuário são apagados: só o link mais recente vale,
 * então "gerar novo link" invalida o antigo (link vazado ou reenviado). */
export async function criarConvite(userId: string, criadoPor: string): Promise<string> {
  const db = sql();
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + VALIDADE_CONVITE_DIAS * 86400_000);
  await db`DELETE FROM public.convites WHERE user_id = ${userId} AND usado_em IS NULL`;
  await db`
    INSERT INTO public.convites (token_hash, user_id, expira_em, criado_por)
    VALUES (${hashToken(token)}, ${userId}, ${expira.toISOString()}, ${criadoPor})
  `;
  // Limpeza oportunista (mesmo padrão das sessões): convites vencidos e usados há mais de 30 dias.
  await db`
    DELETE FROM public.convites
     WHERE expira_em < now() - interval '30 days'
        OR (usado_em IS NOT NULL AND usado_em < now() - interval '30 days')
  `;
  return token;
}
