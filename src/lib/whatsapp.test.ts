import { describe, expect, it } from "vitest";
import { EMPRESA } from "@/data/rotas";
import { mensagemCarrinho, mensagemReserva, whatsappLink } from "./whatsapp";

describe("whatsappLink", () => {
  it("monta a URL wa.me com o número da empresa e a mensagem codificada", () => {
    const link = whatsappLink("Olá!");
    expect(link).toBe(`https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent("Olá!")}`);
  });
});

describe("mensagemReserva", () => {
  it("inclui só os campos informados", () => {
    const msg = mensagemReserva({ rota: "São Luís → Barreirinhas" });
    expect(msg).toContain("Trecho: São Luís → Barreirinhas");
    expect(msg).not.toContain("Data:");
    expect(msg).not.toContain("Embarque:");
  });

  it("junta data e hora quando as duas existem", () => {
    const msg = mensagemReserva({ rota: "X", data: "2026-09-10", hora: "14:00" });
    expect(msg).toContain("Data: 2026-09-10 às 14:00");
  });

  it("mostra só a data quando não há horário", () => {
    const msg = mensagemReserva({ rota: "X", data: "2026-09-10" });
    expect(msg).toContain("Data: 2026-09-10");
    expect(msg).not.toContain("às");
  });
});

describe("mensagemCarrinho", () => {
  it("numera cada trecho do carrinho", () => {
    const msg = mensagemCarrinho([{ trecho: "A → B" }, { trecho: "C → D" }]);
    expect(msg).toContain("1) A → B");
    expect(msg).toContain("2) C → D");
  });

  it("inclui total, nome e telefone só quando informados", () => {
    const msg = mensagemCarrinho([{ trecho: "A → B" }], {
      total: "R$ 650",
      nome: "Angelo",
      telefone: "98999999999",
    });
    expect(msg).toContain("Total estimado: R$ 650");
    expect(msg).toContain("Nome: Angelo");
    expect(msg).toContain("WhatsApp: 98999999999");
  });

  it("não inclui o bloco de extras quando nada é informado", () => {
    const msg = mensagemCarrinho([{ trecho: "A → B" }]);
    expect(msg).not.toContain("Total estimado");
    expect(msg).not.toContain("Nome:");
  });
});
