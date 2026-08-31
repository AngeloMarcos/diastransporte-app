// Server functions de login próprio (deploy em VPS).
// Só entram em uso quando VITE_AUTH_MODE=vps; no Lovable Cloud o login segue
// pelo backend gerenciado.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { senhaForte, SENHA_REGRA_TEXTO } from "@/lib/senha";

export type SessaoAtual = {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  admin: boolean;
} | null;

// Login aceita qualquer senha não-vazia — a regra forte só vale pra CRIAR
// senha nova, nunca pra travar fora quem já tinha uma senha de antes desta
// regra existir.
const credenciais = z.object({
  email: z.string().email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe sua senha.").max(72),
});

const cadastro = z.object({
  email: z.string().email("Informe um e-mail válido."),
  senha: z.string().max(72).refine(senhaForte, SENHA_REGRA_TEXTO),
  nome: z.string().max(120).optional(),
  telefone: z.string().max(40).optional(),
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

export const criarConta = createServerFn({ method: "POST" })
  .inputValidator((data) => cadastro.parse(data))
  .handler(async ({ data }): Promise<NonNullable<SessaoAtual>> => {
    const { criarUsuario, criarSessao, cookieSessao } = await import("./auth.server");
    let usuario;
    try {
      usuario = await criarUsuario({
        email: data.email,
        senha: data.senha,
        ...(data.nome ? { nome: data.nome } : {}),
        ...(data.telefone ? { telefone: data.telefone } : {}),
      });
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : "";
      if (msg.includes("usuarios_email_idx")) throw new Error("Este e-mail já tem conta.");
      throw erro;
    }
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
