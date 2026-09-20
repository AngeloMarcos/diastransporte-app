import { describe, expect, it } from "vitest";

import {
  dadosEstruturadosEmpresa,
  dadosEstruturadosServico,
  ehCaminhoPrivado,
  lastmodIso,
  lastmodMaisRecente,
  urlCanonica,
} from "./seo";

describe("urlCanonica", () => {
  it("junta origem e caminho sem query, hash nem barra final", () => {
    expect(urlCanonica("https://x.com", "/transfers/a-b?carro=grande#topo")).toBe(
      "https://x.com/transfers/a-b",
    );
    expect(urlCanonica("https://x.com/", "/contato/")).toBe("https://x.com/contato");
  });
  it("mantém a raiz como /", () => {
    expect(urlCanonica("https://x.com", "/")).toBe("https://x.com/");
    expect(urlCanonica("https://x.com", "/?a=1")).toBe("https://x.com/");
  });
  it("não emite canonical sem origem nem em páginas privadas", () => {
    expect(urlCanonica("", "/contato")).toBeNull();
    expect(urlCanonica("https://x.com", "/admin")).toBeNull();
    expect(urlCanonica("https://x.com", "/convite/abc")).toBeNull();
  });
});

describe("ehCaminhoPrivado", () => {
  it("não confunde prefixo parecido com área privada", () => {
    expect(ehCaminhoPrivado("/administracao")).toBe(false);
    expect(ehCaminhoPrivado("/admin/pedidos")).toBe(true);
    expect(ehCaminhoPrivado("/transfers")).toBe(false);
  });
});

describe("lastmod", () => {
  it("formata só a data e ignora entradas inválidas", () => {
    expect(lastmodIso("2026-09-20T18:41:06.895Z")).toBe("2026-09-20");
    expect(lastmodIso(null)).toBeUndefined();
    expect(lastmodIso("não é data")).toBeUndefined();
  });
  it("escolhe a data mais recente", () => {
    expect(lastmodMaisRecente(["2026-01-05", null, "2026-03-01T10:00:00Z", "lixo"])).toBe(
      "2026-03-01",
    );
    expect(lastmodMaisRecente([])).toBeUndefined();
  });
});

describe("dados estruturados", () => {
  it("empresa: tipo, telefone internacional e horário", () => {
    const d = dadosEstruturadosEmpresa("https://x.com");
    expect(d["@type"]).toBe("TaxiService");
    expect(d.telephone).toMatch(/^\+55\d{10,11}$/);
    expect(d.openingHoursSpecification.opens).toMatch(/^\d{2}:\d{2}$/);
  });
  it("serviço: preço numérico em BRL e URL da rota", () => {
    const d = dadosEstruturadosServico("https://x.com", {
      slug: "sao-luis-barreirinhas",
      origem: "São Luís",
      destino: "Barreirinhas",
      resumo: "Resumo.",
      precoPequeno: 650,
    });
    expect(d.offers.price).toBe(650);
    expect(d.offers.priceCurrency).toBe("BRL");
    expect(d.url).toBe("https://x.com/transfers/sao-luis-barreirinhas");
  });
});
