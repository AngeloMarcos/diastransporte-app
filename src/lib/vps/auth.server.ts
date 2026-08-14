// Autenticação própria (deploy em VPS): senha com bcrypt, sessão em cookie
// HttpOnly com token opaco. Server-only.
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

import { sql } from "./db.server";

export const COOKIE_SESSAO = "dias_sessao";
const DIAS_VALIDADE = 30;

export type UsuarioServidor = {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  admin: boolean;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12);
}

export async function conferirSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/** Comparação de tokens em tempo constante (para checagens de webhook/token fixo). */
export function comparaSegura(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function cookieSessao(token: string, maxAgeSegundos: number): string {
  const seguro = (process.env["APP_URL"] ?? "").startsWith("https://") ? "; Secure" : "";
  return [
    `${COOKIE_SESSAO}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSegundos}`,
    seguro,
  ].join("; ");
}

export function lerCookieSessao(cabecalho: string | null): string | null {
  if (!cabecalho) return null;
  for (const parte of cabecalho.split(";")) {
    const [nome, ...resto] = parte.trim().split("=");
    if (nome === COOKIE_SESSAO) return resto.join("=") || null;
  }
  return null;
}

export async function criarSessao(userId: string, userAgent: string) {
  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + DIAS_VALIDADE * 86400_000);
  const db = sql();
  await db`
    INSERT INTO public.sessoes (token_hash, user_id, expira_em, user_agent)
    VALUES (${hashToken(token)}, ${userId}, ${expira.toISOString()}, ${userAgent.slice(0, 300)})
  `;
  await db`UPDATE public.usuarios SET ultimo_acesso = now() WHERE id = ${userId}`;
  // Limpeza oportunista das sessões vencidas (evita cron só para isso).
  await db`DELETE FROM public.sessoes WHERE expira_em < now()`;
  return { token, maxAge: DIAS_VALIDADE * 86400 };
}

export async function encerrarSessao(token: string) {
  await sql()`DELETE FROM public.sessoes WHERE token_hash = ${hashToken(token)}`;
}

export async function usuarioDaSessao(token: string | null): Promise<UsuarioServidor | null> {
  if (!token) return null;
  const linhas = await sql()<UsuarioServidor[]>`
    SELECT u.id, u.email, u.nome, u.telefone, u.admin
      FROM public.sessoes s
      JOIN public.usuarios u ON u.id = s.user_id
     WHERE s.token_hash = ${hashToken(token)}
       AND s.expira_em > now()
     LIMIT 1
  `;
  return linhas[0] ?? null;
}

/** Usuário autenticado ou erro — use no início de toda server function protegida. */
export async function exigirUsuario(token: string | null): Promise<UsuarioServidor> {
  const usuario = await usuarioDaSessao(token);
  if (!usuario) throw new Error("Sessão expirada. Entre novamente.");
  return usuario;
}

/** Admin autenticado ou erro — substitui o has_role/RLS do backend gerenciado. */
export async function exigirAdmin(token: string | null): Promise<UsuarioServidor> {
  const usuario = await exigirUsuario(token);
  if (!usuario.admin) throw new Error("Acesso restrito a administradores.");
  return usuario;
}

export async function criarUsuario(dados: {
  email: string;
  senha: string;
  nome?: string;
  telefone?: string;
  admin?: boolean;
}): Promise<UsuarioServidor> {
  const senhaHash = await hashSenha(dados.senha);
  const linhas = await sql()<UsuarioServidor[]>`
    INSERT INTO public.usuarios (email, senha_hash, nome, telefone, admin)
    VALUES (${dados.email.trim()}, ${senhaHash}, ${dados.nome ?? ""}, ${dados.telefone ?? ""}, ${dados.admin ?? false})
    RETURNING id, email, nome, telefone, admin
  `;
  const usuario = linhas[0];
  if (!usuario) throw new Error("Não foi possível criar a conta.");
  return usuario;
}

export async function autenticar(email: string, senha: string): Promise<UsuarioServidor> {
  const linhas = await sql()<(UsuarioServidor & { senha_hash: string })[]>`
    SELECT id, email, nome, telefone, admin, senha_hash
      FROM public.usuarios
     WHERE lower(email) = lower(${email.trim()})
     LIMIT 1
  `;
  const linha = linhas[0];
  // Mensagem única para e-mail inexistente e senha errada (não revela cadastro).
  const generico = "E-mail ou senha incorretos.";
  if (!linha) throw new Error(generico);
  if (!(await conferirSenha(senha, linha.senha_hash))) throw new Error(generico);
  const { senha_hash: _ignorado, ...usuario } = linha;
  return usuario;
}
