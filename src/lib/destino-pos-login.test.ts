import { describe, expect, it } from "vitest";

import { caminhoInternoSeguro, destinoPosLogin } from "./destino-pos-login";

const cliente = { admin: false, motorista: false };
const admin = { admin: true, motorista: false };
const motorista = { admin: false, motorista: true };

describe("caminhoInternoSeguro", () => {
  it("aceita só caminho interno", () => {
    expect(caminhoInternoSeguro("/carrinho")).toBe("/carrinho");
    expect(caminhoInternoSeguro("/transfers?carro=grande")).toBe("/transfers?carro=grande");
  });
  it("descarta o que leva pra fora do site", () => {
    expect(caminhoInternoSeguro("//evil.com")).toBeNull();
    expect(caminhoInternoSeguro("https://evil.com")).toBeNull();
    expect(caminhoInternoSeguro("javascript:alert(1)")).toBeNull();
    expect(caminhoInternoSeguro("/\\evil.com")).toBeNull();
    expect(caminhoInternoSeguro("")).toBeNull();
    expect(caminhoInternoSeguro(null)).toBeNull();
  });
});

describe("destinoPosLogin", () => {
  it("cliente: destino salvo ou Minhas viagens", () => {
    expect(destinoPosLogin(cliente, "/carrinho")).toBe("/carrinho");
    expect(destinoPosLogin(cliente, null)).toBe("/minhas-viagens");
    expect(destinoPosLogin(cliente, "//evil.com")).toBe("/minhas-viagens");
  });
  it("admin: sempre o painel, mesmo com destino de cliente salvo", () => {
    expect(destinoPosLogin(admin, null)).toBe("/admin");
    expect(destinoPosLogin(admin, "/carrinho")).toBe("/admin");
    expect(destinoPosLogin(admin, "/minhas-viagens")).toBe("/admin");
  });
  it("admin: respeita destino dentro do painel", () => {
    expect(destinoPosLogin(admin, "/admin?aba=leads")).toBe("/admin?aba=leads");
    expect(destinoPosLogin(admin, "/administracao")).toBe("/admin");
  });
  it("motorista: painel do motorista", () => {
    expect(destinoPosLogin(motorista, null)).toBe("/motorista");
    expect(destinoPosLogin(motorista, "/carrinho")).toBe("/motorista");
  });
  it("admin que também é motorista vai pro painel do admin", () => {
    expect(destinoPosLogin({ admin: true, motorista: true }, null)).toBe("/admin");
  });
});
