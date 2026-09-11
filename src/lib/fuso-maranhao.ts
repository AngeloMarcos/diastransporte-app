// Maranhão é UTC-3 o ano todo (sem horário de verão desde 2019) — mesma
// regra já usada em vps/despacho-sync.server.ts::combinarDataHora, extraída
// aqui pra não virar uma terceira implementação ad-hoc. Lógica pura (sem
// import de Node), então dá pra usar tanto em código de servidor quanto em
// componente de UI, e testar sem banco.
//
// Achado revisando performance/correção do backend: vpsDashboardDespacho
// calculava "hoje" com `new Date().setHours(0,0,0,0)`, que usa o fuso do
// PROCESSO Node, não o do Maranhão — num container rodando em UTC (comum
// como padrão), "hoje" ficava até 3h adiantado/atrasado perto da meia-noite,
// fazendo o dashboard mostrar ou esconder corridas do dia errado.

/** Início e fim do dia de "agora", em UTC-3 fixo — como instantes reais
 * (ISO em UTC), prontos pra comparar contra timestamptz no banco. */
export function limitesDoDiaEmMaranhao(agora: Date = new Date()): { inicio: string; fim: string } {
  // Desloca 3h antes de fatiar a data: garante que a data "vista" é a do
  // relógio de Maranhão, não a do fuso do processo.
  const emUtc3 = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  const anoMesDia = emUtc3.toISOString().slice(0, 10);
  return {
    inicio: new Date(`${anoMesDia}T00:00:00-03:00`).toISOString(),
    fim: new Date(`${anoMesDia}T23:59:59.999-03:00`).toISOString(),
  };
}
