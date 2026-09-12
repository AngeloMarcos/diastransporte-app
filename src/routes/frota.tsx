import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { listConteudo } from "@/lib/conteudo.functions";
import { listFrotaGaleria, listFrotaVeiculos } from "@/lib/frota.functions";
import { mapearConteudo, texto } from "@/lib/conteudo";
import { FrotaSkeleton, ListagemHeroSkeleton } from "@/components/site/Skeletons";
import { ErroCarregamento } from "@/components/site/ErroCarregamento";
import { origemAtual } from "@/lib/origem-atual.functions";
import logo from "@/assets/logo.jpeg";

export const Route = createFileRoute("/frota")({
  loader: async () => ({
    conteudo: await listConteudo(),
    veiculos: await listFrotaVeiculos(),
    galeria: await listFrotaGaleria(),
    origem: await origemAtual(),
  }),

  head: ({ loaderData }) => ({
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
      // Achado revisando SEO: ver o mesmo comentário em transfers.$rota.tsx.
      ...(loaderData?.origem
        ? [
            { property: "og:image", content: `${loaderData.origem}${logo}` },
            { name: "twitter:image", content: `${loaderData.origem}${logo}` },
          ]
        : []),
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
  // Achado revisando UX: mesmo caso de transfers.index.tsx — texto técnico
  // cru sem "tentar de novo", diferente do resto do site.
  errorComponent: () => (
    <ErroCarregamento
      titulo="Não conseguimos carregar a frota"
      descricao="A conexão pode ter oscilado. Tente de novo em instantes."
    />
  ),
});

function Frota() {
  const dados = Route.useLoaderData();
  const conteudo = mapearConteudo(dados.conteudo);
  const veiculos = dados.veiculos;
  const galeria = dados.galeria;

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
              key={g.foto}
              className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted"
            >
              <img
                src={g.foto}
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
