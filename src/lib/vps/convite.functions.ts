// Server functions PÚBLICAS do convite de acesso (quem abre o link ainda não
// tem sessão). Só em modo VPS (public.convites, migration 0016). O token tem
// 256 bits aleatórios e só o hash fica no banco — sem sessão prévia, é a
// posse do link que autoriza.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { senhaForte, SENHA_REGRA_TEXTO } from "@/lib/senha";

const tokenSchema = z.string().min(20).max(100);

const MSG_LINK_INVALIDO = "Este link já foi usado ou expirou. Peça um novo ao administrador.";

/** O link ainda vale? Devolve só o nome de quem vai definir a senha — nada
 * mais vaza (nem e-mail) pra quem só tem o token. Mesma resposta para
 * "não existe", "já usado" e "expirado". */
export const verificarConvite = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: tokenSchema }).parse(data))
  .handler(async ({ data }): Promise<{ valido: true; nome: string } | { valido: false }> => {
    const [{ sql }, { hashToken }] = await Promise.all([
      import("./db.server"),
      import("./auth.server"),
    ]);
    const [c] = await sql()<{ nome: string; usado: boolean; expirado: boolean }[]>`
      SELECT u.nome, (c.usado_em IS NOT NULL) AS usado, (c.expira_em <= now()) AS expirado
        FROM public.convites c
        JOIN public.usuarios u ON u.id = c.user_id
       WHERE c.token_hash = ${hashToken(data.token)}
    `;
    if (!c || c.usado || c.expirado) return { valido: false };
    return { valido: true, nome: c.nome };
  });

/** O motorista escolhe a própria senha: consome o convite (uso único), troca
 * a senha, derruba sessões antigas e já entra logado. */
export const aceitarConvite = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: tokenSchema,
        senha: z.string().max(72).refine(senhaForte, SENHA_REGRA_TEXTO),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const [{ sql }, { hashToken, hashSenha, criarSessao, cookieSessao }, { gravarAuditoria }] =
      await Promise.all([
        import("./db.server"),
        import("./auth.server"),
        import("./auditoria.server"),
      ]);
    const db = sql();
    const hash = hashToken(data.token);
    const senhaHash = await hashSenha(data.senha);

    const usuario = await db.begin(async (tx) => {
      // FOR UPDATE: dois cliques/abas no mesmo link não consomem duas vezes.
      const [convite] = await tx<{ user_id: string }[]>`
        SELECT user_id FROM public.convites
         WHERE token_hash = ${hash} AND usado_em IS NULL AND expira_em > now()
           FOR UPDATE
      `;
      if (!convite) throw new Error(MSG_LINK_INVALIDO);
      const [u] = await tx<{ id: string; email: string }[]>`
        UPDATE public.usuarios
           SET senha_hash = ${senhaHash}, tentativas_falhas = 0, bloqueado_ate = NULL
         WHERE id = ${convite.user_id}
        RETURNING id, email
      `;
      if (!u) throw new Error(MSG_LINK_INVALIDO);
      await tx`UPDATE public.convites SET usado_em = now() WHERE token_hash = ${hash}`;
      // Sessões antigas caem: quem redefine a senha precisa entrar de novo — e já entra abaixo.
      await tx`DELETE FROM public.sessoes WHERE user_id = ${u.id}`;
      return u;
    });

    const { token, maxAge } = await criarSessao(usuario.id, getRequestHeader("user-agent") ?? "");
    setResponseHeader("set-cookie", cookieSessao(token, maxAge));
    // O ator é o próprio motorista (não há admin nesta chamada). Nunca a senha.
    await gravarAuditoria(
      { id: usuario.id, email: usuario.email },
      {
        acao: "aceitar_convite",
        entidade: "usuario",
        entidadeId: usuario.id,
        resumo: `${usuario.email} definiu a própria senha pelo link de convite`,
      },
    );
    return { ok: true };
  });
