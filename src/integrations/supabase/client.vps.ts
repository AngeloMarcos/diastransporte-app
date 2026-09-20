// Substituto do cliente Supabase no BUILD DA VPS (VITE_AUTH_MODE=vps) — ver
// vite.config.ts. Lá o backend é o Postgres próprio e nenhum caminho de código
// fala com o Supabase; sem esta troca, o cliente inteiro (~100 KB) ia parar no
// navegador de todo visitante sem nunca ser usado. Qualquer uso acidental falha
// alto e claro, como já falhava antes (o cliente real exige variáveis que a VPS
// não tem).
const erro = () =>
  new Error("Supabase não está disponível neste deploy (modo VPS): use src/lib/dados.ts.");

export const supabase = new Proxy({} as Record<string, never>, {
  get() {
    throw erro();
  },
});
