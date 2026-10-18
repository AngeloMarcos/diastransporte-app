import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Search } from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { TrustBadges } from "@/components/site/TrustBadges";
import { RotaCard } from "@/components/site/RotaCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPRESA, formatBRL, fotos, type Rota, type Veiculo } from "@/data/rotas";
import { listRotas } from "@/lib/rotas.functions";
import { listConteudo, type ConteudoRow } from "@/lib/conteudo.functions";
import { listFrotaVeiculos } from "@/lib/frota.functions";
import { mapearConteudo, texto } from "@/lib/conteudo";
import { whatsappLink } from "@/lib/whatsapp";
import { buscaCombina } from "@/lib/busca";
import { tiposDeVeiculo } from "@/lib/publicacao";
import { camposDeBusca } from "@/data/rotas";
import { HomeSkeleton } from "@/components/site/Skeletons";
import { ErroCarregamento } from "@/components/site/ErroCarregamento";
import { origemAtual } from "@/lib/origem-atual.functions";
import { dadosEstruturadosEmpresa } from "@/lib/seo";
import logo from "@/assets/logo.jpeg";

export const Route = createFileRoute("/")({
  loader: async () => ({
    rotas: await listRotas(),
    conteudo: await listConteudo(),
    veiculos: await listFrotaVeiculos(),
    origem: await origemAtual(),
  }),

  head: ({ loaderData }) => ({
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
      // Achado revisando SEO: ver o mesmo comentário em transfers.$rota.tsx.
      ...(loaderData?.origem
        ? [
            { property: "og:image", content: `${loaderData.origem}${logo}` },
            { name: "twitter:image", content: `${loaderData.origem}${logo}` },
          ]
        : []),
      // Dado estruturado da empresa (nome, telefone, área e horário) — ver seo.ts.
      ...(loaderData?.origem
        ? [
            {
              "script:ld+json": dadosEstruturadosEmpresa(
                loaderData.origem,
                `${loaderData.origem}${logo}`,
              ),
            },
          ]
        : []),
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

// Promoção em destaque no topo da home. O valor vem da própria rota (preço do
// carro pequeno, de dia) — o mesmo que o banco cobra na reserva —, então mudar
// o preço no admin muda o banner junto, sem anunciar um valor e cobrar outro.
// Trecho inativo some do banner; sem nenhum, volta o selo de tarifário.
const PROMOCAO_SLUGS = ["sao-luis-barreirinhas", "sao-luis-santo-amaro"];

function Home() {
  const {
    rotas,
    conteudo: conteudoLista,
    veiculos,
  } = Route.useLoaderData() as {
    rotas: Rota[];
    conteudo: ConteudoRow[];
    veiculos: Veiculo[];
  };
  const conteudo = mapearConteudo(conteudoLista);
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const destaques = [...rotas].sort((a, b) => b.popularidade - a.popularidade).slice(0, 3);
  const promocao = PROMOCAO_SLUGS.map((slug) => rotas.find((r) => r.slug === slug)).filter(
    (r): r is Rota => r !== undefined,
  );
  const filtradas = busca.trim() ? rotas.filter((r) => buscaCombina(busca, camposDeBusca(r))) : [];

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const [unica] = filtradas;
    if (filtradas.length === 1 && unica) {
      void navigate({ to: "/transfers/$rota", params: { rota: unica.slug } });
    } else if (busca.trim()) {
      // Achado revisando UX: com múltiplos trechos batendo com o termo
      // (ex.: "Jeri"), a busca virava a listagem inteira sem filtro — a
      // pessoa tinha que digitar tudo de novo lá. Carrega o termo na URL.
      void navigate({ to: "/transfers", search: { busca: busca.trim() } });
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
          {/* text-primary-text (não text-primary): achado de acessibilidade
              — vermelho de marca em 11px falhava o contraste mínimo AA. */}
          {promocao.length > 0 ? (
            <div className="max-w-3xl">
              <span className="inline-block rounded-sm bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-primary-foreground">
                Promoção
              </span>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {promocao.map((r) => (
                  <li key={r.slug}>
                    <Link
                      to="/transfers/$rota"
                      params={{ rota: r.slug }}
                      className="group flex h-full flex-col rounded-lg border border-primary/60 bg-background/85 p-4 backdrop-blur transition-colors hover:border-primary sm:p-5"
                    >
                      <span className="font-display text-lg leading-tight">
                        {r.origem} <span className="text-primary">→</span> {r.destino}
                      </span>
                      <span className="mt-2 font-display text-4xl leading-none text-primary-text sm:text-5xl">
                        {formatBRL(r.precoPequeno)}
                      </span>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        Carro pequeno · preço por veículo
                        <ArrowRight className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <span className="inline-block rounded-sm border border-primary/60 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-primary-text">
              Tarifário temporada 2026
            </span>
          )}
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
            {tiposDeVeiculo(veiculos.length)}, escolhidos conforme o número de passageiros e a
            bagagem.
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
