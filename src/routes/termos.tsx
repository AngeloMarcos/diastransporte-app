import { createFileRoute, Link } from "@tanstack/react-router";

import { IdentificacaoEmpresa, Lista, PaginaTexto, Secao } from "@/components/site/PaginaTexto";
import { EMPRESA } from "@/data/rotas";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso — Dias Transporte" },
      {
        name: "description",
        content:
          "Como funcionam as reservas, os preços e o atendimento de transfer da Dias Transporte, e o que esperamos de quem usa o site.",
      },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <PaginaTexto
      titulo="Termos de uso"
      introducao="Regras simples sobre como usar o site e contratar um transfer com a gente."
      atualizadoEm="20 de setembro de 2026"
    >
      <Secao titulo="Quem somos">
        <IdentificacaoEmpresa />
        <p>
          Oferecemos transfer particular entre São Luís, Barreirinhas, Santo Amaro do Maranhão,
          Parnaíba, Barra Grande e Jericoacoara. Trechos fora dessa lista são orçados sob consulta.
        </p>
      </Secao>

      <Secao titulo="Como funciona a reserva">
        <Lista
          itens={[
            "O pedido feito no site é uma solicitação: a reserva só está confirmada depois que respondemos pelo WhatsApp.",
            "Podemos pedir mais informações (horário de voo, endereço de embarque) para confirmar.",
            `Atendimento: ${EMPRESA.horario.toLowerCase()}; ${EMPRESA.horarioObs}.`,
          ]}
        />
      </Secao>

      <Secao titulo="Preços e pagamento">
        <Lista
          itens={[
            "Os valores são por veículo (não por pessoa), dentro do limite de passageiros de cada porte.",
            "Há tarifa noturna para embarques entre 18h e 5h, quando existir para o trecho.",
            "O valor mostrado no site é o de referência; a confirmação final é feita por nós pelo WhatsApp.",
            "A forma de pagamento (Pix, dinheiro ou cartão) é combinada na confirmação. O site não cobra online.",
          ]}
        />
      </Secao>

      <Secao titulo="O que esperamos de você">
        <Lista
          itens={[
            "Informar dados corretos: nome, telefone, data, horário e local de embarque.",
            "Avisar sobre bagagem fora do padrão (pranchas, bicicletas, excesso) e sobre crianças que precisem de cadeirinha, ao reservar.",
            "Respeitar o limite de passageiros e de bagagem do veículo.",
            "Manter a senha da sua conta em segurança e nos avisar se suspeitar de uso indevido.",
          ]}
        />
      </Secao>

      <Secao titulo="Cancelamento e alterações">
        <p>
          As regras estão na{" "}
          <Link to="/cancelamento" className="text-primary underline-offset-4 hover:underline">
            política de cancelamento
          </Link>
          .
        </p>
      </Secao>

      <Secao titulo="Seus dados">
        <p>
          O uso dos seus dados está descrito na{" "}
          <Link to="/privacidade" className="text-primary underline-offset-4 hover:underline">
            política de privacidade
          </Link>
          .
        </p>
      </Secao>

      <Secao titulo="Mudanças nestes termos">
        <p>
          Podemos atualizar estes termos. A versão em vigor é sempre a desta página, com a data da
          última atualização no topo.
        </p>
      </Secao>

      <Secao titulo="Dúvidas">
        <p>Chame a gente no WhatsApp {EMPRESA.whatsappLabel}.</p>
      </Secao>
    </PaginaTexto>
  );
}
