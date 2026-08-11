import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Search } from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { TrustBadges } from "@/components/site/TrustBadges";
import { RotaCard } from "@/components/site/RotaCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPRESA, fotos, veiculos, type Rota } from "@/data/rotas";
import { listRotas } from "@/lib/rotas.functions";
import { listConteudo, type ConteudoRow } from "@/lib/conteudo.functions";
import { mapearConteudo, texto } from "@/lib/conteudo";
import { whatsappLink } from "@/lib/whatsapp";
import { HomeSkeleton } from "@/components/site/Skeletons";
import { ErroCarregamento } from "@/components/site/ErroCarregamento";

export const Route = createFileRoute("/")({
  loader: async () => ({ rotas: await listRotas(), conteudo: await listConteudo() }),

  head: () => ({
    meta: [
      { title: "Dias Transporte — Transfer São Luís e Lençóis Maranhenses" },
      {
        name: "description",
        content:
          "Transfer particular entre São Luís, Barreirinhas, Santo Amaro, Parnaíba e Jericoacoara. Carros climatizados, motorista da casa e reserva pelo WhatsApp.",
      },
      { property: "og:title", content: "Dias Transporte — Do desembarque às dunas" },
      {
        property: "og:description",
        content:
          "Transfers particulares em São Luís e nos Lençóis Maranhenses. Preço fechado por veículo.",
      },
    ],
  }),
  component: Home,
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: () => (
    <div className="min-h-screen">
      <Header />
      <HomeSkeleton />
      <Footer />
    </div>
  ),
  errorComponent: () => (
    <ErroCarregamento
      titulo="Não conseguimos carregar a página inicial"
      voltarPara="/transfers"
      voltarLabel="Ver transfers"
    />
  ),
});

const passos = [
  { n: "01", t: "Escolha o trecho", d: "Selecione a rota, a data e o tipo de carro no site." },
  { n: "02", t: "Confirme no WhatsApp", d: "Enviamos disponibilidade e detalhes em minutos." },
  { n: "03", t: "Embarque tranquilo", d: "Buscamos no aeroporto ou na sua hospedagem." },
];

const depoimentos = [
  {
    nome: "Camila R.",
    texto:
      "Chegamos em São Luís de madrugada e o motorista já estava esperando. Viagem confortável até Barreirinhas.",
  },
  {
    nome: "Rodrigo M.",
    texto: "Fizemos São Luís → Santo Amaro e depois Barreirinhas → Jeri. Pontualidade impecável.",
  },
  {
    nome: "Família Aguiar",
    texto:
      "Pegamos o carro grande por causa das malas. Valeu cada centavo, o motorista foi atencioso.",
  },
];

function Home() {
  const { rotas, conteudo: conteudoLista } = Route.useLoaderData() as {
    rotas: Rota[];
    conteudo: ConteudoRow[];
  };
  const conteudo = mapearConteudo(conteudoLista);
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const destaques = [...rotas].sort((a, b) => b.popularidade - a.popularidade).slice(0, 3);
  const filtradas = busca.trim()
    ? rotas.filter((r) =>
        `${r.origem} ${r.destino}`.toLowerCase().includes(busca.trim().toLowerCase()),
      )
    : [];

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const [unica] = filtradas;
    if (filtradas.length === 1 && unica) {
      void navigate({ to: "/transfers/$rota", params: { rota: unica.slug } });
    } else {
      void navigate({ to: "/transfers" });
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <section className="relative flex min-h-[88vh] items-center">
        <img
          src={texto(conteudo, "home_hero", "imagem", fotos.fileira)}
          alt="Frota de carros da Dias Transporte alinhada na estrada do Maranhão"
          width={1920}
          height={1080}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-center"
        />

        <div className="absolute inset-0 overlay-escuro" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-section">
          <span className="inline-block rounded-sm border border-primary/60 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-primary">
            Tarifário temporada 2026
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-fluid-hero leading-[0.95]">
            {texto(conteudo, "home_hero", "titulo", "Do desembarque às dunas")}
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            {texto(
              conteudo,
              "home_hero",
              "texto",
              "Transfer particular entre São Luís, Barreirinhas, Santo Amaro e toda a Rota das Emoções. Preço fechado por veículo, sem rateio e sem espera.",
            )}
          </p>

          <form
            onSubmit={buscar}
            className="mt-8 max-w-xl rounded-lg border border-border bg-background/80 p-3 backdrop-blur"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Para onde você vai? Ex: Barreirinhas"
                className="h-11 border-border bg-card"
              />
              <Button type="submit" className="h-11 px-6">
                <Search className="size-4" /> Buscar
              </Button>
            </div>
            {filtradas.length > 0 && (
              <ul className="mt-3 divide-y divide-border overflow-hidden rounded-sm border border-border">
                {filtradas.slice(0, 4).map((r) => (
                  <li key={r.slug}>
                    <Link
                      to="/transfers/$rota"
                      params={{ rota: r.slug }}
                      className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                    >
                      <span>
                        {r.origem} → {r.destino}
                      </span>
                      <ArrowRight className="size-4 text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </form>
        </div>
      </section>

      <TrustBadges />

      <section className="mx-auto max-w-6xl px-4 py-section">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-fluid-xl">
              {texto(conteudo, "home_sobre", "titulo", "Rotas mais pedidas")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {texto(
                conteudo,
                "home_sobre",
                "texto",
                "Valores por veículo, já com combustível, pedágio e motorista.",
              )}
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link to="/transfers">
              Ver todos os trechos <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {destaques.map((r) => (
            <RotaCard key={r.slug} rota={r} />
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-section">
          <h2 className="font-display text-fluid-xl">A frota</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Dois tipos de veículo, escolhidos conforme o número de passageiros e a bagagem.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {veiculos.map((v) => (
              <div
                key={v.nome}
                className="overflow-hidden rounded-lg border border-border bg-background"
              >
                <img
                  src={v.foto}
                  alt={v.modelo}
                  loading="lazy"
                  decoding="async"
                  width={960}
                  height={600}
                  className="aspect-[16/10] w-full object-cover object-center"
                />

                <div className="p-5">
                  <h3 className="font-display text-xl">{v.nome}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{v.modelo}</p>
                  <p className="mt-3 text-sm">
                    {v.passageiros} · {v.bagagem}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Button asChild variant="secondary" className="mt-8">
            <Link to="/frota">
              Conhecer os veículos <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-section">
        <h2 className="font-display text-fluid-xl">Como funciona</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {passos.map((p) => (
            <div key={p.n} className="rounded-lg border border-border bg-card p-6">
              <span className="font-display text-4xl text-primary">{p.n}</span>
              <h3 className="mt-3 text-lg">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-section">
          <h2 className="font-display text-fluid-xl">Quem já viajou com a gente</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {depoimentos.map((d) => (
              <blockquote
                key={d.nome}
                className="rounded-lg border border-border bg-background p-6"
              >
                <p className="text-sm text-muted-foreground">“{d.texto}”</p>
                <footer className="mt-4 text-sm font-semibold">{d.nome}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <img
          src={fotos.frotaPorDoSol}
          alt="Frota da Dias Transporte ao pôr do sol"
          loading="lazy"
          decoding="async"
          width={1920}
          height={1080}
          className="absolute inset-0 size-full object-cover object-center"
        />

        <div className="absolute inset-0 overlay-escuro" />
        <div className="relative mx-auto max-w-6xl px-4 py-section text-center">
          <h2 className="font-display text-fluid-2xl">Reserve seu trecho agora</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
            Responda no WhatsApp {EMPRESA.whatsappLabel} com a data e o trecho — confirmamos a
            disponibilidade na hora.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 bg-whats text-whats-foreground hover:bg-whats/90"
          >
            <a
              href={whatsappLink("Olá! Quero reservar um transfer com a Dias Transporte.")}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-5" /> Reservar pelo WhatsApp
            </a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
