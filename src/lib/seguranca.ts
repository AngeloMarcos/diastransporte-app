// Endurecimento HTTP do deploy próprio (VPS) — lógica pura, sem dependência de
// runtime: cabeçalhos de segurança, origem real atrás de proxy e limite de
// requisições por IP. Ligado em src/server.ts só quando MODO_VPS (o Lovable
// Cloud tem o próprio edge e embute o site num iframe de pré-visualização).

/** Cabeçalhos de segurança de toda resposta. HSTS só sob HTTPS: mandar HSTS por
 * HTTP puro é ignorado pelo navegador, e no IP:porta de teste seria enganoso. */
export function cabecalhosDeSeguranca(opcoes: { https: boolean }): Record<string, string> {
  // CSP moderada, de propósito: o SSR do TanStack injeta scripts inline de
  // hidratação (por isso 'unsafe-inline' em script-src) e as fotos podem vir
  // de qualquer HTTPS. O ganho está em fechar o resto: sem embutir o site em
  // iframe (clickjacking), sem <base>/<object>, formulários só pro próprio site.
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  return {
    "content-security-policy": csp,
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "cross-origin-opener-policy": "same-origin",
    ...(opcoes.https ? { "strict-transport-security": "max-age=31536000; includeSubDomains" } : {}),
  };
}

type CabecalhosLeitura = { get(nome: string): string | null };

/** Origem pública (esquema + host) de quem fez o pedido. Atrás do Caddy, a URL
 * que o Node enxerga é interna (http://app:3000) — o esquema e o host reais
 * vêm em x-forwarded-proto / x-forwarded-host. Usado no canonical, sitemap e
 * og:image, que precisam da URL absoluta que o visitante realmente usa. */
export function origemDaRequisicao(url: string, cabecalhos: CabecalhosLeitura): string {
  const base = new URL(url);
  // Só o primeiro valor: proxies em cadeia acrescentam à direita.
  const primeiro = (v: string | null) => v?.split(",")[0]?.trim() || null;
  const proto = primeiro(cabecalhos.get("x-forwarded-proto"));
  const host = primeiro(cabecalhos.get("x-forwarded-host"));
  const esquema = proto === "https" || proto === "http" ? proto : base.protocol.replace(":", "");
  // Host precisa parecer um host de verdade — nada de "/" ou espaço que
  // permita injetar caminho/cabeçalho na origem devolvida.
  const hostValido = host && /^[a-z0-9.-]+(:\d{1,5})?$/i.test(host) ? host : null;
  return `${esquema}://${hostValido ?? base.host}`;
}

/** A requisição chegou por HTTPS (direto ou pelo proxy)? */
export function requisicaoHttps(url: string, cabecalhos: CabecalhosLeitura): boolean {
  return origemDaRequisicao(url, cabecalhos).startsWith("https://");
}

/** Janela deslizante em memória: no máximo `max` eventos por chave a cada
 * `janelaMs`. Serve um processo só (o app roda em 1 container); atrás de vários
 * processos cada um teria o próprio contador. */
export class LimiteDeTaxa {
  private readonly eventos = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly janelaMs: number,
  ) {}

  /** Registra um evento e diz se passou do limite. `agora` injetável pra teste. */
  excedeu(chave: string, agora: number = Date.now()): { excedeu: boolean; retryAposSeg: number } {
    const inicio = agora - this.janelaMs;
    const recentes = (this.eventos.get(chave) ?? []).filter((t) => t > inicio);
    if (recentes.length >= this.max) {
      this.eventos.set(chave, recentes);
      const maisAntigo = recentes[0] ?? agora;
      return {
        excedeu: true,
        retryAposSeg: Math.max(1, Math.ceil((maisAntigo + this.janelaMs - agora) / 1000)),
      };
    }
    recentes.push(agora);
    this.eventos.set(chave, recentes);
    if (this.eventos.size > 5000) this.limpar(agora);
    return { excedeu: false, retryAposSeg: 0 };
  }

  /** Descarta chaves sem eventos na janela, pra o mapa não crescer sem fim. */
  private limpar(agora: number) {
    const inicio = agora - this.janelaMs;
    for (const [chave, ts] of this.eventos) {
      if (!ts.some((t) => t > inicio)) this.eventos.delete(chave);
    }
  }
}

/** IP do cliente atrás do Caddy: o proxy SOBRESCREVE x-forwarded-for com o IP
 * real de quem conectou, então o último valor é o confiável. */
export function ipDoCliente(cabecalhos: CabecalhosLeitura): string {
  const xff = cabecalhos.get("x-forwarded-for");
  const ultimo = xff?.split(",").at(-1)?.trim();
  return ultimo || cabecalhos.get("x-real-ip") || "desconhecido";
}

/** Só escritas em endpoints da aplicação entram no limite — leituras e páginas
 * (GET) não, pra não punir quem só navega. */
export function pedidoLimitavel(metodo: string, caminho: string): boolean {
  if (metodo !== "POST") return false;
  return caminho.startsWith("/_serverFn/") || caminho.startsWith("/api/");
}
