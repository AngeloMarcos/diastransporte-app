// Versão VPS de auth-attacher.ts (ver client.vps.ts): a sessão da VPS já viaja
// no cookie HttpOnly, então não há token de Supabase para anexar às chamadas.
import { createMiddleware } from "@tanstack/react-start";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) =>
  next(),
);
