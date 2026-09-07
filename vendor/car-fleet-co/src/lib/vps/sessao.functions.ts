// Server functions de login próprio (deploy em VPS).
// Só entram em uso quando VITE_AUTH_MODE=vps; no Supabase Cloud o login segue
// pelo GoTrue. Sem cadastro público: contas de motorista só são criadas por
// um admin já logado (ver src/lib/vps/dados.functions.ts, Fase 2), e o
// primeiro admin é criado via db/criar-admins.mjs — igual ao que o próprio
// app já fazia no Supabase (bootstrap público foi removido por ser
// vulnerável, ver gap-analysis-backend-banco.md).
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export type SessaoAtual = {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  admin: boolean;
  motorista: boolean;
} | null;

const credenciais = z.object({
  email: z.string().email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe sua senha.").max(72),
});

export const sessaoAtual = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessaoAtual> => {
    const { lerCookieSessao, usuarioDaSessao } = await import("./auth.server");
    const usuario = await usuarioDaSessao(lerCookieSessao(getRequestHeader("cookie") ?? null));
    return usuario ?? null;
  },
);

export const entrar = createServerFn({ method: "POST" })
  .inputValidator((data) => credenciais.parse(data))
  .handler(async ({ data }): Promise<NonNullable<SessaoAtual>> => {
    const { autenticar, criarSessao, cookieSessao } = await import("./auth.server");
    const usuario = await autenticar(data.email, data.senha);
    const { token, maxAge } = await criarSessao(usuario.id, getRequestHeader("user-agent") ?? "");
    setResponseHeader("set-cookie", cookieSessao(token, maxAge));
    return usuario;
  });

export const sair = createServerFn({ method: "POST" }).handler(async () => {
  const { lerCookieSessao, encerrarSessao, cookieSessao } = await import("./auth.server");
  const token = lerCookieSessao(getRequestHeader("cookie") ?? null);
  if (token) await encerrarSessao(token);
  setResponseHeader("set-cookie", cookieSessao("", 0));
  return { ok: true };
});
