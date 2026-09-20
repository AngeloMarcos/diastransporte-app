import { describe, expect, it } from "vitest";

import {
  linkRespostaLead,
  linkTelefone,
  mensagemAvisoLead,
  novoLeadSchema,
  telefoneValido,
} from "./leads";

describe("telefoneValido", () => {
  it("aceita formatos comuns digitados à mão", () => {
    expect(telefoneValido("(98) 98150-6268")).toBe(true);
    expect(telefoneValido("+55 98 98150-6268")).toBe(true);
    expect(telefoneValido("98981506268")).toBe(true);
  });
  it("recusa o que é curto demais ou não é número", () => {
    expect(telefoneValido("123")).toBe(false);
    expect(telefoneValido("abc")).toBe(false);
    expect(telefoneValido("")).toBe(false);
  });
});

describe("novoLeadSchema", () => {
  const base = { nome: "Maria Souza", telefone: "(98) 98150-6268" };

  it("aceita só nome e telefone", () => {
    const r = novoLeadSchema.parse(base);
    expect(r.trecho).toBeUndefined();
    expect(r.dataViagem).toBeUndefined();
  });

  it("transforma campos opcionais vazios em ausentes", () => {
    const r = novoLeadSchema.parse({ ...base, trecho: "  ", dataViagem: "", observacoes: "" });
    expect(r.trecho).toBeUndefined();
    expect(r.dataViagem).toBeUndefined();
    expect(r.observacoes).toBeUndefined();
  });

  it("apara espaços e mantém a data válida", () => {
    const r = novoLeadSchema.parse({ ...base, nome: "  Maria  ", dataViagem: "2026-10-05" });
    expect(r.nome).toBe("Maria");
    expect(r.dataViagem).toBe("2026-10-05");
  });

  it("recusa nome curto, telefone ruim e data em outro formato", () => {
    expect(novoLeadSchema.safeParse({ ...base, nome: "A" }).success).toBe(false);
    expect(novoLeadSchema.safeParse({ ...base, telefone: "123" }).success).toBe(false);
    expect(novoLeadSchema.safeParse({ ...base, dataViagem: "05/10/2026" }).success).toBe(false);
  });

  it("recusa observações gigantes", () => {
    expect(novoLeadSchema.safeParse({ ...base, observacoes: "x".repeat(1001) }).success).toBe(
      false,
    );
  });
});

describe("linkTelefone", () => {
  it("deixa só os dígitos", () => {
    expect(linkTelefone("(98) 98150-6268")).toBe("tel:98981506268");
  });
  it("preserva o + internacional", () => {
    expect(linkTelefone("+55 98 98150-6268")).toBe("tel:+5598981506268");
  });
});

describe("linkRespostaLead", () => {
  it("monta o wa.me do cliente com o primeiro nome e o trecho", () => {
    const link = linkRespostaLead(
      { nome: "Maria Souza", trecho: "São Luís → Barreirinhas" },
      "(98) 98150-6268",
    );
    expect(link).toContain("https://wa.me/5598981506268?text=");
    const texto = decodeURIComponent(link!.split("text=")[1]!);
    expect(texto).toContain("Olá, Maria!");
    expect(texto).toContain("São Luís → Barreirinhas");
  });
  it("devolve null para telefone que não é brasileiro", () => {
    expect(linkRespostaLead({ nome: "John", trecho: null }, "+1 415 555 2671")).toBeNull();
  });
});

describe("mensagemAvisoLead", () => {
  it("inclui só o que foi informado", () => {
    const msg = mensagemAvisoLead({ nome: "Maria", telefone: "98981506268" });
    expect(msg).toContain("Maria");
    expect(msg).toContain("Telefone: 98981506268");
    expect(msg).not.toContain("Trecho");
    expect(msg).not.toContain("Data");
  });
});
