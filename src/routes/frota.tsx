import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { veiculos, fotos } from "@/data/rotas";
import { listConteudo } from "@/lib/conteudo.functions";
import { mapearConteudo, texto } from "@/lib/conteudo";
import { FrotaSkeleton, ListagemHeroSkeleton } from "@/components/site/Skeletons";

export const Route = createFileRoute("/frota")({
  loader: () => listConteudo(),

  head: () => ({
    meta: [
      { title: "Nossa frota — Dias Transporte" },
      {
        name: "description",
        content:
          "Fiat Cronos e VW T-Cross climatizados, revisados e prontos para a estrada dos Lençóis Maranhenses. Veja capacidade de passageiros e bagagem.",
      },
      { property: "og:title", content: "Nossa frota — Dias Transporte" },
      {
        property: "og:description",
        content: "Carro pequeno até 4 passageiros e carro grande até 5, com porta-malas amplo.",
      },
    ],
  }),
  component: Frota,
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: () => (
    <div className="min-h-screen">
      <Header />
      <ListagemHeroSkeleton />
      <FrotaSkeleton />
      <Footer />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-section" role="alert">
        <h1 className="font-display text-fluid-2xl">Não conseguimos carregar a frota</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Footer />
    </div>
  ),
});

const galeria = [
  { src: fotos.cronosPredio, alt: "Fiat Cronos grafite em frente a um hotel em São Luís" },
  { src: fotos.cronosMar, alt: "Fiat Cronos estacionado na orla de São Luís" },
  { src: fotos.tcrossCronos, alt: "VW T-Cross branco e Fiat Cronos preto lado a lado" },
  { src: fotos.cronosTCross, alt: "Fiat Cronos e T-Cross em estacionamento" },
  { src: fotos.fileira, alt: "Frota alinhada na estrada para os Lençóis Maranhenses" },
  { src: fotos.frotaPorDoSol, alt: "Frota da Dias Transporte ao pôr do sol" },
  { src: fotos.cronosChuva, alt: "Fiat Cronos em frente a pousada em Barreirinhas" },
  { src: fotos.cronosNoite, alt: "Fiat Cronos em embarque noturno" },
];

function Frota() {
  const conteudo = mapearConteudo(Route.useLoaderData());

  return (
    <div className="min-h-screen">
      <Header />

      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-section">
          <h1 className="font-display text-fluid-2xl">
            {texto(conteudo, "frota_intro", "titulo", "Nossa frota")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {texto(
              conteudo,
              "frota_intro",
              "texto",
              "Carros próprios, revisados a cada viagem e com ar-condicionado. Você escolhe o porte do veículo de acordo com o grupo e a bagagem.",
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-section">
        <div className="grid gap-6 md:grid-cols-2">
          {veiculos.map((v) => (
            <div key={v.nome} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                <img
                  src={v.foto}
                  alt={v.modelo}
                  loading="lazy"
                  decoding="async"
                  width={960}
                  height={600}
                  className="absolute inset-0 size-full object-cover object-center"
                />
              </div>
              <div className="p-6">
                <h2 className="font-display text-fluid-lg">{v.nome}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{v.modelo}</p>
                <p className="mt-4 text-sm">
                  {v.passageiros} · {v.bagagem}
                </p>
                <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                  {v.itens.map((i) => (
                    <li key={i}>— {i}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-16 font-display text-fluid-lg">Na estrada</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {galeria.map((g) => (
            <div
              key={g.src}
              className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted"
            >
              <img
                src={g.src}
                alt={g.alt}
                loading="lazy"
                decoding="async"
                width={600}
                height={600}
                className="absolute inset-0 size-full object-cover object-center"
              />
            </div>
          ))}
        </div>

        <Button asChild className="mt-10">
          <Link to="/transfers">Ver tarifário completo</Link>
        </Button>
      </section>

      <Footer />
    </div>
  );
}
