// Flag client-safe: em qual infraestrutura este build está rodando.
// VITE_AUTH_MODE=vps  → login próprio + Postgres da VPS (src/lib/vps/*)
// ausente/"cloud"     → backend gerenciado do Lovable Cloud (comportamento atual)
export const MODO_VPS = import.meta.env["VITE_AUTH_MODE"] === "vps";

/** Prefixo público dos uploads no deploy próprio (servido pelo Caddy/Nginx). */
export const PREFIXO_UPLOADS = "/api/uploads";
