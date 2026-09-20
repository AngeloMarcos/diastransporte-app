import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

import { IdentificacaoEmpresa, Lista, PaginaTexto, Secao } from "@/components/site/PaginaTexto";
import { Button } from "@/components/ui/button";
import { EMPRESA } from "@/data/rotas";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Dias Transporte — Transfer no Maranhão" },
      {
        name: "description",
        content:
          "Conheça a Dias Transporte: transfers particulares entre São Luís, Barreirinhas e a Rota das Emoções, com carros climatizados e motoristas que conhecem o trajeto.",
      },
    ],
  }),
  component: Sobre,
});

function Sobre() {
  return (
    <PaginaTexto
      titulo="Sobre a Dias Transporte"
      introducao={`${EMPRESA.assinatura}: transfers particulares entre São Luís, os Lençóis Maranhenses e a Rota das Emoções.`}
    >
      <Secao titulo="O que fazemos">
        <p>
          Levamos você do aeroporto ou do hotel até o destino, e de volta, em um veículo só para o
          seu grupo. Nossa base é {EMPRESA.base}.
        </p>
      </Secao>

      <Secao titulo="Como trabalhamos">
        <Lista
          itens={[
            "Preço fechado por veículo, sem taxa escondida.",
            "Veículos climatizados, com água a bordo.",
            "Motoristas que conhecem o trajeto e acompanham o seu voo nos embarques no aeroporto.",
            "Combustível e pedágios inclusos.",
            "Atendimento direto pelo WhatsApp: você fala com quem organiza a sua viagem.",
          ]}
        />
      </Secao>

      <Secao titulo="Onde atuamos">
        <p>
          São Luís, Barreirinhas, Santo Amaro do Maranhão, Parnaíba, Barra Grande e Jericoacoara.
          Outros trechos são orçados sob consulta.
        </p>
      </Secao>

      <Secao titulo="Quem responde pelo site">
        <IdentificacaoEmpresa />
        <p>
          Atendimento: {EMPRESA.horario.toLowerCase()} · WhatsApp {EMPRESA.whatsappLabel}.
        </p>
      </Secao>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild className="min-h-11">
          <Link to="/transfers">Ver transfers e preços</Link>
        </Button>
        <Button asChild className="min-h-11 bg-whats text-whats-foreground hover:bg-whats/90">
          <a
            href={whatsappLink("Olá! Quero informações sobre transfer.")}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="size-4" /> Falar no WhatsApp
          </a>
        </Button>
      </div>
    </PaginaTexto>
  );
}
