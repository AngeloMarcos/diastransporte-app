import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { MODO_VPS } from "@/lib/vps/config";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  // attachSupabaseAuth toca o cliente Supabase (auto-gerado pela Lovable) a
  // cada chamada de server function — em MODO_VPS não há projeto Supabase
  // conectado, e essa mesma chamada lança "Missing Supabase environment
  // variable(s)" para QUALQUER rota com loader baseado em server function
  // (achado rodando de verdade pela primeira vez contra a VPS). Sem
  // Supabase Auth na VPS, não há sessão pra anexar mesmo — a sessão da VPS
  // já viaja sozinha via cookie HttpOnly em cada request.
  functionMiddleware: MODO_VPS ? [] : [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
