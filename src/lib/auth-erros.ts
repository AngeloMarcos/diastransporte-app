// Traduz as mensagens de erro do Supabase Auth (sempre em inglês) para
// português — o resto do site é todo em pt-BR, misturar idioma no meio do
// login confunde quem não é fluente em inglês. Só usada para erros vindos
// do SDK do Supabase (auth.* e o update de profiles em auth.tsx) — nunca
// para os Error() escritos à mão em português no resto do app.
const MAPA: [RegExp, string][] = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, "Confirme seu e-mail antes de entrar."],
  [/user already registered|already been registered/i, "Este e-mail já tem uma conta cadastrada."],
  [
    /password is known to be weak|easy to guess/i,
    "Essa senha é muito comum e fácil de adivinhar — escolha outra.",
  ],
  [/password should be at least|should contain at least/i, "Senha muito curta ou simples demais."],
  [/new password should be different/i, "A nova senha precisa ser diferente da senha atual."],
  [/unable to validate email address/i, "E-mail inválido."],
  [
    /for security purposes.*after \d+ seconds?/i,
    "Por segurança, aguarde alguns segundos antes de tentar de novo.",
  ],
  [
    /email rate limit|rate limit/i,
    "Muitas tentativas seguidas — aguarde um instante e tente de novo.",
  ],
  [
    /token has expired or is invalid|invalid.*token/i,
    "Este link expirou ou já foi usado — peça um novo.",
  ],
  [/network/i, "Falha de conexão — verifique sua internet e tente de novo."],
];

export function traduzirErroAuth(erro: unknown): string {
  const bruto = erro instanceof Error ? erro.message : String(erro ?? "");
  for (const [padrao, traducao] of MAPA) {
    if (padrao.test(bruto)) return traducao;
  }
  // Nenhum padrão bateu: em vez de vazar a mensagem original (quase sempre
  // em inglês, vinda do Supabase), cai numa mensagem genérica em
  // português — a original ainda fica disponível pra quem olhar o console.
  if (bruto) console.error("[auth] erro não mapeado:", bruto);
  return "Não foi possível concluir. Tente novamente.";
}
