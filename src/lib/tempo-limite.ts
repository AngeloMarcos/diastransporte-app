// Tempo limite para chamadas que hoje podem ficar penduradas pra sempre
// (auditoria do site: a aba "Usuários e acessos" ficava em skeleton eterno).
// react-query não tem timeout próprio — sem isto, uma chamada que nunca
// responde nunca vira estado de erro, então nunca aparece "Tentar de novo".

export class TempoLimiteError extends Error {
  constructor(ms: number) {
    super(`A operação passou de ${String(Math.round(ms / 1000))}s sem resposta.`);
    this.name = "TempoLimiteError";
  }
}

export function comTempoLimite<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TempoLimiteError(ms));
    }, ms);
    promessa.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      (erro: unknown) => {
        clearTimeout(timer);
        reject(erro instanceof Error ? erro : new Error(String(erro)));
      },
    );
  });
}

/** Mensagem segura pra mostrar na tela do admin: erro de infraestrutura
 * (variável de ambiente faltando, conexão recusada, stack) nunca vaza pro
 * usuário — o detalhe real vai pro console. Erros de regra de negócio
 * ("Você não pode remover seu próprio acesso") passam como estão. */
export function mensagemAmigavel(erro: unknown, padrao: string): string {
  if (!(erro instanceof Error)) return padrao;
  if (erro instanceof TempoLimiteError) return "Demorou demais para responder. Tente de novo.";
  const infra =
    /supabase|environment variable|econnrefused|enotfound|etimedout|fetch failed|database_url|connection|lovable cloud|internal server|unhandled/i;
  if (infra.test(erro.message)) return padrao;
  return erro.message || padrao;
}
