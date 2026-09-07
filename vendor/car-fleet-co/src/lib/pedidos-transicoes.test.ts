import { describe, expect, it } from "vitest";
import { transicaoValida, transicoesPermitidas } from "./pedidos-transicoes";

describe("transicoesPermitidas", () => {
  it("admin libera um pedido pendente para a rede", () => {
    expect(transicoesPermitidas("pendente_liberacao", "admin")).toEqual(
      expect.arrayContaining(["liberada_rede", "venda_cancelada"]),
    );
  });

  it("motorista não pode liberar nem cancelar um pedido pendente", () => {
    expect(transicoesPermitidas("pendente_liberacao", "motorista")).toEqual([]);
  });

  it("admin ou motorista podem aceitar um pedido atribuído", () => {
    expect(transicoesPermitidas("motorista_atribuido", "admin")).toEqual(
      expect.arrayContaining(["aceita_motorista"]),
    );
    expect(transicoesPermitidas("motorista_atribuido", "motorista")).toEqual(["aceita_motorista"]);
  });

  it("motorista pode encerrar uma corrida em atendimento (finalizada ou no-show)", () => {
    expect(transicoesPermitidas("em_atendimento", "motorista")).toEqual(
      expect.arrayContaining(["corrida_finalizada", "no_show_driver", "no_show_pax"]),
    );
  });

  it("nenhum papel pode sair de um estado terminal", () => {
    expect(transicoesPermitidas("corrida_finalizada", "admin")).toEqual([]);
    expect(transicoesPermitidas("no_show_driver", "admin")).toEqual([]);
    expect(transicoesPermitidas("no_show_pax", "motorista")).toEqual([]);
  });

  it("admin pode cancelar em quase qualquer estado não-terminal, motorista nunca", () => {
    expect(transicoesPermitidas("em_atendimento", "admin")).toEqual(
      expect.arrayContaining(["venda_cancelada"]),
    );
    expect(transicoesPermitidas("em_atendimento", "motorista")).not.toEqual(
      expect.arrayContaining(["venda_cancelada"]),
    );
  });
});

describe("transicaoValida", () => {
  it("aceita uma transição presente na lista de permitidas", () => {
    expect(transicaoValida("liberada_rede", "motorista_atribuido", "admin")).toBe(true);
  });

  it("recusa uma transição que pula etapas", () => {
    expect(transicaoValida("pendente_liberacao", "corrida_finalizada", "admin")).toBe(false);
  });

  it("recusa um motorista tentando atribuir/liberar (papel errado)", () => {
    expect(transicaoValida("pendente_liberacao", "liberada_rede", "motorista")).toBe(false);
  });
});
