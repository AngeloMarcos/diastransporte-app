import { describe, expect, it } from "vitest";
import { traduzirErroAuth } from "./auth-erros";

describe("traduzirErroAuth", () => {
  it("traduz credenciais inválidas", () => {
    expect(traduzirErroAuth(new Error("Invalid login credentials"))).toBe(
      "E-mail ou senha incorretos.",
    );
  });

  it("traduz e-mail não confirmado", () => {
    expect(traduzirErroAuth(new Error("Email not confirmed"))).toBe(
      "Confirme seu e-mail antes de entrar.",
    );
  });

  it("traduz e-mail já cadastrado", () => {
    expect(traduzirErroAuth(new Error("User already registered"))).toBe(
      "Este e-mail já tem uma conta cadastrada.",
    );
  });

  it("não reconhece um padrão desconhecido — mantém a mensagem original", () => {
    expect(traduzirErroAuth(new Error("Algo muito específico aconteceu"))).toBe(
      "Algo muito específico aconteceu",
    );
  });

  it("usa uma mensagem padrão quando o erro não tem texto", () => {
    expect(traduzirErroAuth(new Error(""))).toBe("Não foi possível concluir. Tente novamente.");
  });

  it("lida com um erro que não é instância de Error", () => {
    expect(traduzirErroAuth("invalid login credentials")).toBe("E-mail ou senha incorretos.");
  });
});
