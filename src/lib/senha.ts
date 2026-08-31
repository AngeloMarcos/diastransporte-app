// Regra mínima de senha aplicada sempre que uma senha é CRIADA/REDEFINIDA
// (cadastro, "esqueci minha senha", redefinição pelo admin) — nunca no
// login, pra não trancar fora quem já tinha uma senha de antes desta regra
// existir. Client-safe: sem import de servidor.

export const SENHA_MIN = 8;
export const SENHA_REGRA_TEXTO = `Pelo menos ${SENHA_MIN} caracteres, com letras e números.`;

export function senhaForte(senha: string): boolean {
  return senha.length >= SENHA_MIN && /[a-zA-Z]/.test(senha) && /[0-9]/.test(senha);
}
