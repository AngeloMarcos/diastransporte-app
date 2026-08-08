import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { TrustBadges } from "@/components/site/TrustBadges";
import { RotaCard } from "@/components/site/RotaCard";
import { Button } from "@/components/ui/button";
import { rotas } from "@/data/rotas";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/transfers/")({
  head: () => ({
    meta: [
      { title: "Transfers e tarifário 2026 — Dias Transporte" },
      {
        name: "description",
        content:
          "Todos os trechos de transfer particular: São Luís, Barreirinhas, Santo Amaro, Parnaíba, Barra Grande e Jericoacoara. Preços da temporada 2026.",
      },
      { property: "og:title", content: "Transfers e tarifário 2026 — Dias Transporte" },
      {
        property: "og:description",
        content: "Preço fechado por veículo em todos os trechos do Maranhão e da Rota das Emoções.",
      },
    ],
  }),
  component: Transfers,
});

type Ordem = "populares" | "menor" | "maior";
type Filtro = "todos" | "pequeno" | "grande";

function Transfers() {
  const [ordem, setOrdem] = useState<Ordem>("populares");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const lista = useMemo(() => {
    const base = rotas.filter((r) => (filtro === "grande" ? r.precoGrande !== null : true));
    const copia = [...base];
    if (ordem === "menor") copia.sort((a, b) => a.precoPequeno - b.precoPequeno);
    else if (ordem === "maior") copia.sort((a, b) => b.precoPequeno - a.precoPequeno);
    else copia.sort((a, b) => b.popularidade - a.popularidade);
    return copia;
  }, [ordem, filtro]);

  return (
    <div className="min-h-screen">
      <Header />

      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="font-display text-4xl sm:text-5xl">Transfers particulares</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Tarifário temporada 2026. Todos os valores são por veículo (não por pessoa) e incluem
            combustível, pedágio e motorista.
          </p>
        </div>
      </section>

      <TrustBadges />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{lista.length} trechos disponíveis</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["todos", "Todos"],
                ["pequeno", "Carro pequeno"],
                ["grande", "Carro grande"],
              ] as const
            ).map(([v, l]) => (
              <Button
                key={v}
                size="sm"
                variant={filtro === v ? "default" : "secondary"}
                onClick={() => setFiltro(v)}
              >
                {l}
              </Button>
            ))}
            <span className="mx-1 hidden w-px bg-border sm:block" />
            {(
              [
                ["populares", "Mais pedidos"],
                ["menor", "Menor valor"],
                ["maior", "Maior valor"],
              ] as const
            ).map(([v, l]) => (
              <Button
                key={v}
                size="sm"
                variant={ordem === v ? "default" : "secondary"}
                onClick={() => setOrdem(v)}
              >
                {l}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((r) => (
            <RotaCard key={r.slug} rota={r} />
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-6">
          <div>
            <h2 className="font-display text-xl">Precisa de ida e volta ou de um trecho fora da lista?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Montamos o roteiro completo e fechamos um valor único.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-whats text-whats-foreground hover:bg-whats/90">
              <a
                href={whatsappLink("Olá! Quero um orçamento de transfer personalizado.")}
                target="_blank"
                rel="noreferrer"
              >
                Pedir orçamento
              </a>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/frota">
                Ver frota <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
