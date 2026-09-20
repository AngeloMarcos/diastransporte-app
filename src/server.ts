import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import {
  LimiteDeTaxa,
  cabecalhosDeSeguranca,
  ipDoCliente,
  pedidoLimitavel,
  requisicaoHttps,
} from "./lib/seguranca";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Endurecimento HTTP: cabeçalhos de segurança em toda resposta e limite de escritas por IP.
// 120 escritas/min por IP: folgado pra quem usa o painel, curto pra quem
// automatiza cadastro ou tentativa de senha (que ainda tem o bloqueio por conta).
const limiteEscritas = new LimiteDeTaxa(120, 60_000);

function comCabecalhosDeSeguranca(request: Request, response: Response): Response {
  const cabecalhos = cabecalhosDeSeguranca({
    https: requisicaoHttps(request.url, request.headers),
  });
  // Respostas de fetch/estáticos podem ter cabeçalhos imutáveis: copia antes de mexer.
  const nova = new Response(response.body, response);
  for (const [nome, valor] of Object.entries(cabecalhos)) nova.headers.set(nome, valor);
  return nova;
}

async function tratar(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  if (pedidoLimitavel(request.method, new URL(request.url).pathname)) {
    const { excedeu, retryAposSeg } = limiteEscritas.excedeu(ipDoCliente(request.headers));
    if (excedeu) {
      return new Response(
        JSON.stringify({ erro: "Muitas requisições. Tente de novo em instantes." }),
        {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": String(retryAposSeg) },
        },
      );
    }
  }
  try {
    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    return comCabecalhosDeSeguranca(request, await tratar(request, env, ctx));
  },
};
