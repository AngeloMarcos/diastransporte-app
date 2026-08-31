// Traduz as mensagens de erro do Supabase Auth (sempre em inglês) para
// português — o resto do site é todo em pt-BR, misturar idioma no meio do
// login confunde quem não é fluente em inglês.
const MAPA: [RegExp, string][] = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar."],
  [/user already registered/i, "Este e-mail já tem uma conta cadastrada."],
  [/password should be at least/i, "A senha precisa ter pelo menos 6 caracteres."],
  [/unable to validate email address/i, "E-mail inválido."],
  [
    /for security purposes.*after \d+ seconds?/i,
    "Por segurança, aguarde alguns segundos antes de tentar de novo.",
  ],
  [/rate limit/i, "Muitas tentativas seguidas — aguarde um instante e tente de novo."],
  [/network/i, "Falha de conexão — verifique sua internet e tente de novo."],
];

export function traduzirErroAuth(erro: unknown): string {
  const bruto = erro instanceof Error ? erro.message : String(erro ?? "");
  for (const [padrao, traducao] of MAPA) {
    if (padrao.test(bruto)) return traducao;
  }
  return bruto || "Não foi possível concluir. Tente novamente.";
}
