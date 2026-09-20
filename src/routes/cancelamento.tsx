import { createFileRoute } from "@tanstack/react-router";

import { Lista, PaginaTexto, Secao } from "@/components/site/PaginaTexto";
import { EMPRESA } from "@/data/rotas";

const HORAS = String(EMPRESA.cancelamentoGratisHoras);

export const Route = createFileRoute("/cancelamento")({
  head: () => ({
    meta: [
      { title: "Política de cancelamento — Dias Transporte" },
      {
        name: "description",
        content: `Cancelamento sem custo até ${HORAS}h antes do embarque. Veja como remarcar ou cancelar seu transfer com a Dias Transporte.`,
      },
    ],
  }),
  component: Cancelamento,
});

function Cancelamento() {
  return (
    <PaginaTexto
      titulo="Política de cancelamento"
      introducao="Como cancelar ou remarcar um transfer, e o que muda perto da data."
      atualizadoEm="20 de setembro de 2026"
    >
      <Secao titulo="Cancelamento sem custo">
        <p>
          Você pode cancelar sem nenhum custo até <strong>{HORAS} horas antes</strong> do horário de
          embarque combinado.
        </p>
      </Secao>

      <Secao titulo="Depois desse prazo">
        <p>
          Passado o prazo, fale com a gente pelo WhatsApp {EMPRESA.whatsappLabel}: procuramos
          reagendar o transfer conforme a disponibilidade de carros e motoristas.
        </p>
      </Secao>

      <Secao titulo="Como cancelar ou remarcar">
        <Lista
          itens={[
            "Avise pelo WhatsApp, informando o nome da reserva, o trecho e a data.",
            "Alterações de horário também são combinadas por lá, conforme a disponibilidade.",
            "Se você tem conta no site, também pode cancelar pela página Minhas viagens.",
          ]}
        />
      </Secao>

      <Secao titulo="Pagamento">
        <p>
          O site não cobra nada no momento do pedido: a reserva é uma solicitação, confirmada por
          nós pelo WhatsApp, e a forma de pagamento é combinada com você nessa conversa.
        </p>
      </Secao>

      <Secao titulo="Voos atrasados ou alterados">
        <p>
          Nos embarques no aeroporto acompanhamos o status do voo, então um atraso normal não exige
          cancelar. Se o seu voo mudou de dia ou de horário, avise assim que souber para ajustarmos
          o transfer.
        </p>
      </Secao>
    </PaginaTexto>
  );
}
