// Link e mensagem do convite de acesso do motorista — lógica pura (client-safe).

export function montarLinkConvite(origem: string, token: string): string {
  return `${origem.replace(/\/+$/, "")}/convite/${token}`;
}

/** Número pro formato do wa.me (só dígitos, com DDI 55 quando vem sem). null se
 * não parece um telefone brasileiro utilizável (DDD + 8/9 dígitos, ou já com DDI). */
export function telefoneParaWhatsapp(telefone: string | null | undefined): string | null {
  const bruto = (telefone ?? "").trim();
  // "+" explícito com outro país (ex.: +1 415…, 11 dígitos que pareceriam DDD + número) não é BR.
  if (bruto.startsWith("+") && !bruto.startsWith("+55")) return null;
  const digitos = bruto.replace(/\D/g, "");
  const local =
    (digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")
      ? digitos.slice(2)
      : digitos;
  // DDD brasileiro: 11 a 99 (sem zero) + 8 ou 9 dígitos.
  if ((local.length === 10 || local.length === 11) && /^[1-9][1-9]/.test(local)) {
    return `55${local}`;
  }
  return null;
}

export function mensagemConviteMotorista(nome: string, link: string): string {
  const primeiroNome = nome.trim().split(/\s+/)[0] ?? "";
  return (
    `Olá${primeiroNome ? `, ${primeiroNome}` : ""}! Você foi cadastrado como motorista na Dias Transporte. ` +
    `Abra o link para escolher a sua senha e acessar suas corridas (vale por 7 dias e só pode ser usado uma vez):\n${link}`
  );
}

/** wa.me direto pro motorista (não o do dono da empresa) com a mensagem pronta;
 * null se o telefone não serve — a tela então só oferece "Copiar link". */
export function linkWhatsappConvite(
  telefone: string | null | undefined,
  mensagem: string,
): string | null {
  const numero = telefoneParaWhatsapp(telefone);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : null;
}
