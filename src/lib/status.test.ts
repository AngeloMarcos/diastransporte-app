import { describe, expect, it } from "vitest";
import {
  contarStatus,
  podeConcluir,
  STATUS_ATIVOS,
  statusOpcoes,
  transicaoValidaAgendamento,
} from "./status";

describe("contarStatus", () => {
  it("conta cada status separadamente", () => {
    const contagem = contarStatus([
      { status: "pendente" },
      { status: "pendente" },
      { status: "confirmado" },
      { status: "cancelado" },
    ]);
    expect(contagem["pendente"]).toBe(2);
    expect(contagem["confirmado"]).toBe(1);
    expect(contagem["concluido"]).toBe(0);
    expect(contagem["cancelado"]).toBe(1);
  });

  it("devolve zero pra lista vazia, sem faltar nenhum status conhecido", () => {
    const contagem = contarStatus([]);
    for (const s of statusOpcoes) {
      expect(contagem[s]).toBe(0);
    }
  });
});

describe("podeConcluir", () => {
  it("só permite concluir uma corrida já confirmada pelo escritório", () => {
    expect(podeConcluir("confirmado")).toBe(true);
  });

  it("não permite concluir uma corrida ainda pendente, cancelada ou já concluída", () => {
    expect(podeConcluir("pendente")).toBe(false);
    expect(podeConcluir("cancelado")).toBe(false);
    expect(podeConcluir("concluido")).toBe(false);
  });
});

describe("STATUS_ATIVOS", () => {
  it("considera pendente e confirmado como corridas ainda em aberto", () => {
    expect(STATUS_ATIVOS.has("pendente")).toBe(true);
    expect(STATUS_ATIVOS.has("confirmado")).toBe(true);
  });

  it("trata concluído e cancelado como histórico", () => {
    expect(STATUS_ATIVOS.has("concluido")).toBe(false);
    expect(STATUS_ATIVOS.has("cancelado")).toBe(false);
  });
});

describe("transicaoValidaAgendamento", () => {
  it("permite o fluxo normal: pendente -> confirmado -> concluido", () => {
    expect(transicaoValidaAgendamento("pendente", "confirmado")).toBe(true);
    expect(transicaoValidaAgendamento("confirmado", "concluido")).toBe(true);
  });

  it("permite cancelar a partir de pendente ou confirmado", () => {
    expect(transicaoValidaAgendamento("pendente", "cancelado")).toBe(true);
    expect(transicaoValidaAgendamento("confirmado", "cancelado")).toBe(true);
  });

  it("concluido é terminal — só admite virar cancelado, nunca volta a pendente/confirmado", () => {
    expect(transicaoValidaAgendamento("concluido", "cancelado")).toBe(true);
    expect(transicaoValidaAgendamento("concluido", "pendente")).toBe(false);
    expect(transicaoValidaAgendamento("concluido", "confirmado")).toBe(false);
  });

  it("cancelado só pode ser reaberto pra pendente, não pula direto pra confirmado/concluido", () => {
    expect(transicaoValidaAgendamento("cancelado", "pendente")).toBe(true);
    expect(transicaoValidaAgendamento("cancelado", "confirmado")).toBe(false);
    expect(transicaoValidaAgendamento("cancelado", "concluido")).toBe(false);
  });

  it("não permite ficar no mesmo status (não é uma transição)", () => {
    for (const s of statusOpcoes) {
      expect(transicaoValidaAgendamento(s, s)).toBe(false);
    }
  });
});
