import { describe, expect, it } from "vitest";
import { hojeEmMaranhao, limitesDoDiaEmMaranhao } from "./fuso-maranhao";

describe("limitesDoDiaEmMaranhao", () => {
  it("usa o dia de Maranhão (UTC-3), não o UTC, perto da virada", () => {
    // 02:00 UTC de 10/set = 23:00 de 09/set em Maranhão — "hoje" deveria
    // ainda ser 09/set, não 10/set. Um cálculo baseado no fuso local do
    // processo (ex.: um container em UTC) erraria isso.
    const { inicio, fim } = limitesDoDiaEmMaranhao(new Date("2026-09-10T02:00:00Z"));
    expect(inicio).toBe(new Date("2026-09-09T03:00:00Z").toISOString());
    expect(fim).toBe(new Date("2026-09-10T02:59:59.999Z").toISOString());
  });

  it("um horário bem no meio da tarde em Maranhão não vira o dia errado", () => {
    // 18:00 UTC = 15:00 em Maranhão, mesmo dia.
    const { inicio, fim } = limitesDoDiaEmMaranhao(new Date("2026-09-10T18:00:00Z"));
    expect(inicio).toBe(new Date("2026-09-10T03:00:00Z").toISOString());
    expect(fim).toBe(new Date("2026-09-11T02:59:59.999Z").toISOString());
  });
});

describe("hojeEmMaranhao", () => {
  it("às 23:30 em Maranhão (02:30 UTC do dia seguinte) ainda é o dia local", () => {
    // 2026-09-21T02:30Z == 2026-09-20 23:30 em UTC-3
    expect(hojeEmMaranhao(new Date("2026-09-21T02:30:00Z"))).toBe("2026-09-20");
  });
  it("meio-dia é o mesmo dia nos dois fusos", () => {
    expect(hojeEmMaranhao(new Date("2026-09-20T15:00:00Z"))).toBe("2026-09-20");
  });
  it("virada: 03:00 UTC já é 00:00 do dia novo em Maranhão", () => {
    expect(hojeEmMaranhao(new Date("2026-09-21T03:00:00Z"))).toBe("2026-09-21");
  });
});
