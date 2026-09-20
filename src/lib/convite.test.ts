import { describe, expect, it } from "vitest";
import {
  linkWhatsappConvite,
  mensagemConviteMotorista,
  montarLinkConvite,
  telefoneParaWhatsapp,
} from "./convite";

describe("montarLinkConvite", () => {
  it("junta origem e token sem barra dupla", () => {
    expect(montarLinkConvite("http://179.197.74.90:3002/", "abc")).toBe(
      "http://179.197.74.90:3002/convite/abc",
    );
    expect(montarLinkConvite("https://dias.com.br", "abc")).toBe("https://dias.com.br/convite/abc");
  });
});

describe("telefoneParaWhatsapp", () => {
  it("acrescenta o DDI 55 a DDD + número", () => {
    expect(telefoneParaWhatsapp("(98) 98150-6268")).toBe("5598981506268");
    expect(telefoneParaWhatsapp("98 3222-1234")).toBe("559832221234");
  });
  it("mantém número que já vem com DDI", () => {
    expect(telefoneParaWhatsapp("+55 98 98150-6268")).toBe("5598981506268");
  });
  it("recusa o que não parece telefone", () => {
    expect(telefoneParaWhatsapp("")).toBeNull();
    expect(telefoneParaWhatsapp(null)).toBeNull();
    expect(telefoneParaWhatsapp("12345")).toBeNull();
    expect(telefoneParaWhatsapp("+1 415 555 2671")).toBeNull();
  });
});

describe("mensagemConviteMotorista", () => {
  it("cumprimenta pelo primeiro nome e inclui o link", () => {
    const m = mensagemConviteMotorista("João da Silva", "https://x/convite/t");
    expect(m).toContain("Olá, João!");
    expect(m).toContain("https://x/convite/t");
    expect(m).toContain("7 dias");
  });
});

describe("linkWhatsappConvite", () => {
  it("vai direto pro telefone do motorista, mensagem codificada", () => {
    const l = linkWhatsappConvite("(98) 98150-6268", "oi & tchau");
    expect(l).toBe("https://wa.me/5598981506268?text=oi%20%26%20tchau");
  });
  it("sem telefone válido → null (a tela só oferece copiar)", () => {
    expect(linkWhatsappConvite("abc", "x")).toBeNull();
  });
});
