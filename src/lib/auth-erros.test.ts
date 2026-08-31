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

  it("traduz senha fraca/comum detectada pelo Supabase", () => {
    expect(
      traduzirErroAuth(
        new Error("Password is known to be weak and easy to guess, please choose a different one"),
      ),
    ).toBe("Essa senha é muito comum e fácil de adivinhar — escolha outra.");
  });

  it("traduz link de recuperação expirado/inválido", () => {
    expect(traduzirErroAuth(new Error("Token has expired or is invalid"))).toBe(
      "Este link expirou ou já foi usado — peça um novo.",
    );
  });

  it("não vaza um erro em inglês não mapeado — cai numa mensagem genérica em português", () => {
    expect(traduzirErroAuth(new Error("Some brand new Supabase error message"))).toBe(
      "Não foi possível concluir. Tente novamente.",
    );
  });

  it("usa a mesma mensagem padrão quando o erro não tem texto", () => {
    expect(traduzirErroAuth(new Error(""))).toBe("Não foi possível concluir. Tente novamente.");
  });

  it("lida com um erro que não é instância de Error", () => {
    expect(traduzirErroAuth("invalid login credentials")).toBe("E-mail ou senha incorretos.");
  });
});
