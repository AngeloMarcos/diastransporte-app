import { describe, expect, it } from "vitest";

import {
  LimiteDeTaxa,
  cabecalhosDeSeguranca,
  ipDoCliente,
  origemDaRequisicao,
  pedidoLimitavel,
  requisicaoHttps,
} from "./seguranca";

const h = (obj: Record<string, string>) => ({
  get: (n: string) => obj[n.toLowerCase()] ?? null,
});

describe("cabecalhosDeSeguranca", () => {
  it("sempre bloqueia iframe, sniffing e objetos", () => {
    const c = cabecalhosDeSeguranca({ https: false });
    expect(c["x-frame-options"]).toBe("DENY");
    expect(c["x-content-type-options"]).toBe("nosniff");
    expect(c["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(c["content-security-policy"]).toContain("object-src 'none'");
  });
  it("HSTS só com HTTPS", () => {
    expect(cabecalhosDeSeguranca({ https: false })["strict-transport-security"]).toBeUndefined();
    expect(cabecalhosDeSeguranca({ https: true })["strict-transport-security"]).toContain(
      "max-age=",
    );
  });
  it("libera as fontes do Google e imagens https (as fotos do site)", () => {
    const csp = cabecalhosDeSeguranca({ https: true })["content-security-policy"] ?? "";
    expect(csp).toContain("https://fonts.googleapis.com");
    expect(csp).toContain("https://fonts.gstatic.com");
    expect(csp).toMatch(/img-src[^;]*https:/);
  });
});

describe("origemDaRequisicao", () => {
  it("sem proxy, usa a própria URL", () => {
    expect(origemDaRequisicao("http://179.197.74.90:3002/x", h({}))).toBe(
      "http://179.197.74.90:3002",
    );
  });
  it("atrás do Caddy, usa o esquema e o host encaminhados", () => {
    expect(
      origemDaRequisicao(
        "http://app:3000/sitemap.xml",
        h({ "x-forwarded-proto": "https", "x-forwarded-host": "diastransporte.site" }),
      ),
    ).toBe("https://diastransporte.site");
  });
  it("pega só o primeiro valor de cadeias de proxy", () => {
    expect(
      origemDaRequisicao(
        "http://app:3000/",
        h({ "x-forwarded-proto": "https, http", "x-forwarded-host": "a.com, b.com" }),
      ),
    ).toBe("https://a.com");
  });
  it("ignora host malformado e esquema estranho", () => {
    expect(
      origemDaRequisicao(
        "http://app:3000/",
        h({ "x-forwarded-proto": "javascript", "x-forwarded-host": "evil.com/x y" }),
      ),
    ).toBe("http://app:3000");
  });
});

describe("requisicaoHttps", () => {
  it("detecta HTTPS vindo do proxy", () => {
    expect(requisicaoHttps("http://app:3000/", h({ "x-forwarded-proto": "https" }))).toBe(true);
    expect(requisicaoHttps("http://app:3000/", h({}))).toBe(false);
  });
});

describe("LimiteDeTaxa", () => {
  it("bloqueia depois do máximo dentro da janela e libera depois dela", () => {
    const l = new LimiteDeTaxa(3, 60_000);
    expect(l.excedeu("ip", 0).excedeu).toBe(false);
    expect(l.excedeu("ip", 1000).excedeu).toBe(false);
    expect(l.excedeu("ip", 2000).excedeu).toBe(false);
    const r = l.excedeu("ip", 3000);
    expect(r.excedeu).toBe(true);
    expect(r.retryAposSeg).toBe(57);
    expect(l.excedeu("ip", 60_001).excedeu).toBe(false);
  });
  it("conta cada chave separadamente e não conta pedido bloqueado", () => {
    const l = new LimiteDeTaxa(1, 1000);
    expect(l.excedeu("a", 0).excedeu).toBe(false);
    expect(l.excedeu("b", 0).excedeu).toBe(false);
    expect(l.excedeu("a", 10).excedeu).toBe(true);
    expect(l.excedeu("a", 1001).excedeu).toBe(false);
  });
});

describe("ipDoCliente", () => {
  it("usa o último x-forwarded-for (o que o proxy escreveu)", () => {
    expect(ipDoCliente(h({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("2.2.2.2");
  });
  it("cai em x-real-ip e depois em 'desconhecido'", () => {
    expect(ipDoCliente(h({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(ipDoCliente(h({}))).toBe("desconhecido");
  });
});

describe("pedidoLimitavel", () => {
  it("só POST em server functions e /api", () => {
    expect(pedidoLimitavel("POST", "/_serverFn/abc")).toBe(true);
    expect(pedidoLimitavel("POST", "/api/uploads")).toBe(true);
    expect(pedidoLimitavel("GET", "/_serverFn/abc")).toBe(false);
    expect(pedidoLimitavel("POST", "/contato")).toBe(false);
  });
});
