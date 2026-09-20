import { describe, expect, it, vi } from "vitest";
import { comTempoLimite, mensagemAmigavel, TempoLimiteError } from "./tempo-limite";

describe("comTempoLimite", () => {
  it("devolve o valor quando responde a tempo", async () => {
    await expect(comTempoLimite(Promise.resolve(42), 1000)).resolves.toBe(42);
  });

  it("rejeita com TempoLimiteError quando passa do limite", async () => {
    vi.useFakeTimers();
    const pendente = comTempoLimite(new Promise<never>(() => undefined), 5000);
    const esperado = expect(pendente).rejects.toBeInstanceOf(TempoLimiteError);
    await vi.advanceTimersByTimeAsync(5001);
    await esperado;
    vi.useRealTimers();
  });

  it("repassa o erro original quando a promessa rejeita", async () => {
    await expect(comTempoLimite(Promise.reject(new Error("falhou")), 1000)).rejects.toThrow(
      "falhou",
    );
  });
});

describe("mensagemAmigavel", () => {
  const padrao = "Não foi possível carregar.";
  it("esconde erro de infraestrutura do Supabase", () => {
    const e = new Error(
      "Missing Supabase environment variable(s): SUPABASE_URL. Connect Supabase in Lovable Cloud.",
    );
    expect(mensagemAmigavel(e, padrao)).toBe(padrao);
  });
  it("esconde falha de conexão", () => {
    expect(mensagemAmigavel(new Error("connect ECONNREFUSED 127.0.0.1:5432"), padrao)).toBe(padrao);
  });
  it("mantém mensagem de regra de negócio", () => {
    const m = "Você não pode remover seu próprio acesso de administrador.";
    expect(mensagemAmigavel(new Error(m), padrao)).toBe(m);
  });
  it("mensagem específica pra tempo esgotado", () => {
    expect(mensagemAmigavel(new TempoLimiteError(1000), padrao)).toContain("Demorou");
  });
  it("valor que não é Error cai no padrão", () => {
    expect(mensagemAmigavel("x", padrao)).toBe(padrao);
  });
});
