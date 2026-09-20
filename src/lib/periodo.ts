// Tarifa dia/noite derivada do HORÁRIO da viagem — lógica pura (sem Node),
// usada pela tela de reserva (mostrar a tarifa certa na hora) e pelo servidor.
//
// Achado da auditoria do site no navegador: o período era um botão manual
// ("Dia" / "18h às 5h"), independente do horário digitado. Às 22:00 com o
// botão em "Dia" o carro grande saía R$ 900 em vez de R$ 950 (tarifa da
// noite) — o cliente pagava a tarifa errada, e o trigger de preço do banco
// confiava no período que o navegador mandava. Agora o horário decide, na
// tela e no banco (migration 0014, mesma regra em SQL).

export type PeriodoTarifa = "dia" | "noite";

/** "HH:MM" (24h) — o formato que <input type="time"> devolve. */
export const HORA_REGEX = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Noite = das 18:00 às 04:59 (a tarifa "18h às 5h" do tarifário: às 05:00
 * em ponto já é dia). null se o horário não é um HH:MM válido — quem chama
 * decide o que fazer (a tela exige horário; o banco mantém o período
 * recebido, que só acontece em escrita administrativa sem horário). */
export function periodoPelaHora(hora: string | null | undefined): PeriodoTarifa | null {
  if (!hora || !HORA_REGEX.test(hora)) return null;
  const h = Number(hora.split(":")[0]);
  return h >= 18 || h < 5 ? "noite" : "dia";
}
