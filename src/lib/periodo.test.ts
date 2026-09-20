import { describe, expect, it } from "vitest";
import { periodoPelaHora } from "./periodo";

describe("periodoPelaHora", () => {
  it("22:00 é noite — o caso que cobrava a tarifa do dia", () => {
    expect(periodoPelaHora("22:00")).toBe("noite");
  });
  it("18:00 em ponto já é noite", () => {
    expect(periodoPelaHora("18:00")).toBe("noite");
  });
  it("17:59 ainda é dia", () => {
    expect(periodoPelaHora("17:59")).toBe("dia");
  });
  it("madrugada (00:00 a 04:59) é noite", () => {
    expect(periodoPelaHora("00:00")).toBe("noite");
    expect(periodoPelaHora("04:59")).toBe("noite");
  });
  it("05:00 em ponto já é dia", () => {
    expect(periodoPelaHora("05:00")).toBe("dia");
  });
  it("horário comercial é dia", () => {
    expect(periodoPelaHora("08:30")).toBe("dia");
    expect(periodoPelaHora("12:00")).toBe("dia");
  });
  it("aceita hora sem zero à esquerda", () => {
    expect(periodoPelaHora("5:00")).toBe("dia");
    expect(periodoPelaHora("4:30")).toBe("noite");
  });
  it("inválido ou vazio → null (não chuta)", () => {
    expect(periodoPelaHora("")).toBeNull();
    expect(periodoPelaHora(null)).toBeNull();
    expect(periodoPelaHora("25:00")).toBeNull();
    expect(periodoPelaHora("18:60")).toBeNull();
    expect(periodoPelaHora("noite")).toBeNull();
  });
});
