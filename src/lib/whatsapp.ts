import { EMPRESA } from "@/data/rotas";

export function whatsappLink(mensagem: string) {
  return `https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemReserva(dados: {
  rota: string;
  data?: string | undefined;
  hora?: string | undefined;
  periodo?: string | undefined;
  carro?: string | undefined;
  passageiros?: number | undefined;
  embarque?: string | undefined;
  valor?: string | undefined;
}) {
  const linhas = [`Olá, ${EMPRESA.nome}! Quero reservar um transfer.`, ``, `Trecho: ${dados.rota}`];
  if (dados.data) linhas.push(`Data: ${dados.data}${dados.hora ? ` às ${dados.hora}` : ""}`);
  if (dados.periodo) linhas.push(`Período: ${dados.periodo}`);
  if (dados.carro) linhas.push(`Veículo: ${dados.carro}`);
  if (dados.passageiros) linhas.push(`Passageiros: ${dados.passageiros}`);
  if (dados.embarque) linhas.push(`Embarque: ${dados.embarque}`);
  if (dados.valor) linhas.push(`Valor informado no site: ${dados.valor}`);
  linhas.push(``, `Pode confirmar a disponibilidade?`);
  return linhas.join("\n");
}

export function mensagemCarrinho(
  itens: {
    trecho: string;
    data?: string | undefined;
    hora?: string | undefined;
    periodo?: string | undefined;
    carro?: string | undefined;
    passageiros?: number | undefined;
    embarque?: string | undefined;
    valor?: string | undefined;
  }[],
  extras?: { nome?: string | undefined; telefone?: string | undefined; total?: string | undefined },
) {
  const linhas = [`Olá, ${EMPRESA.nome}! Quero confirmar estas reservas:`];
  itens.forEach((item, i) => {
    linhas.push(``, `${i + 1}) ${item.trecho}`);
    if (item.data) linhas.push(`   Data: ${item.data}${item.hora ? ` às ${item.hora}` : ""}`);
    if (item.periodo) linhas.push(`   Período: ${item.periodo}`);
    if (item.carro) linhas.push(`   Veículo: ${item.carro}`);
    if (item.passageiros) linhas.push(`   Passageiros: ${item.passageiros}`);
    if (item.embarque) linhas.push(`   Embarque: ${item.embarque}`);
    if (item.valor) linhas.push(`   Valor: ${item.valor}`);
  });
  if (extras?.total) linhas.push(``, `Total estimado: ${extras.total}`);
  if (extras?.nome) linhas.push(`Nome: ${extras.nome}`);
  if (extras?.telefone) linhas.push(`WhatsApp: ${extras.telefone}`);
  linhas.push(``, `Pode confirmar a disponibilidade?`);
  return linhas.join("\n");
}
