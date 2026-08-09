import { EMPRESA } from "@/data/rotas";

export function whatsappLink(mensagem: string) {
  return `https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemReserva(dados: {
  rota: string;
  data?: string | undefined;
  periodo?: string | undefined;
  carro?: string | undefined;
  passageiros?: number | undefined;
  valor?: string | undefined;
}) {
  const linhas = [`Olá, ${EMPRESA.nome}! Quero reservar um transfer.`, ``, `Trecho: ${dados.rota}`];
  if (dados.data) linhas.push(`Data: ${dados.data}`);
  if (dados.periodo) linhas.push(`Período: ${dados.periodo}`);
  if (dados.carro) linhas.push(`Veículo: ${dados.carro}`);
  if (dados.passageiros) linhas.push(`Passageiros: ${dados.passageiros}`);
  if (dados.valor) linhas.push(`Valor informado no site: ${dados.valor}`);
  linhas.push(``, `Pode confirmar a disponibilidade?`);
  return linhas.join("\n");
}
