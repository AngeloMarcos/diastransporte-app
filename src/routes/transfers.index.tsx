import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { TrustBadges } from "@/components/site/TrustBadges";
import { RotaCard } from "@/components/site/RotaCard";
import { ErroCarregamento } from "@/components/site/ErroCarregamento";
import { ListagemHeroSkeleton, RotaGridSkeleton } from "@/components/site/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Rota } from "@/data/rotas";
import { listRotas } from "@/lib/rotas.functions";
import { whatsappLink } from "@/lib/whatsapp";
import { origemAtual } from "@/lib/origem-atual.functions";
import logo from "@/assets/logo.jpeg";

export const Route = createFileRoute("/transfers/")({
  // Achado revisando UX: a busca da home, quando o termo batia com mais de
  // uma rota (ex.: "Jeri", que casa com as duas rotas de Jericoacoara),
  // jogava a pessoa pra cá sem carregar o termo — tinha que digitar tudo
  // de novo. "busca" na query string carrega o termo de um lugar pro outro.
  validateSearch: (busca: Record<string, unknown>): { busca?: string } =>
    typeof busca["busca"] === "string" ? { busca: busca["busca"] } : {},
  loader: async () => ({ rotas: await listRotas(), origem: await origemAtual() }),
  head: ({ loaderData }) => ({
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
      // Achado revisando SEO: ver o mesmo comentário em transfers.$rota.tsx.
      ...(loaderData?.origem
        ? [
            { property: "og:image", content: `${loaderData.origem}${logo}` },
            { name: "twitter:image", content: `${loaderData.origem}${logo}` },
          ]
        : []),
    ],
  }),
  component: Transfers,
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: TransfersPendente,
  // Achado revisando UX: esta era uma das duas páginas do site que ainda
  // mostravam um <div> cru com error.message vazando texto técnico e sem
  // "tentar de novo" — todo o resto já usa ErroCarregamento (retry +
  // caminho de volta). Página de bastante tráfego (lista completa de
  // transfers) pra ficar um beco sem saída.
  errorComponent: () => (
    <ErroCarregamento
      titulo="Não conseguimos carregar o tarifário"
      descricao="A conexão pode ter oscilado. Tente de novo em instantes."
    />
  ),
});

function TransfersPendente() {
  return (
    <div className="min-h-screen">
      <Header />
      <ListagemHeroSkeleton />
      <TrustBadges />
      <section className="mx-auto max-w-6xl px-4 py-section">
        <RotaGridSkeleton />
      </section>
      <Footer />
    </div>
  );
}

type Ordem = "populares" | "menor" | "maior";
type Filtro = "todos" | "pequeno" | "grande";

function Transfers() {
  const { rotas } = Route.useLoaderData() as { rotas: Rota[] };
  const [ordem, setOrdem] = useState<Ordem>("populares");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const { busca: buscaNaUrl } = Route.useSearch();
  const [busca, setBusca] = useState(buscaNaUrl ?? "");

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = rotas
      .filter((r) => (filtro === "grande" ? r.precoGrande !== null : true))
      .filter((r) => !termo || `${r.origem} ${r.destino}`.toLowerCase().includes(termo));
    const copia = [...base];
    if (ordem === "menor") copia.sort((a, b) => a.precoPequeno - b.precoPequeno);
    else if (ordem === "maior") copia.sort((a, b) => b.precoPequeno - a.precoPequeno);
    else copia.sort((a, b) => b.popularidade - a.popularidade);
    return copia;
  }, [rotas, ordem, filtro, busca]);

  return (
    <div className="min-h-screen">
      <Header />

      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-section">
          <h1 className="font-display text-fluid-2xl">Transfers particulares</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Tarifário temporada 2026. Todos os valores são por veículo (não por pessoa) e incluem
            combustível, pedágio e motorista.
          </p>
        </div>
      </section>

      <TrustBadges />

      <section className="mx-auto max-w-6xl px-4 py-section">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por origem ou destino"
            className="h-11 pl-9"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
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

        {lista.length ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {lista.map((r) => (
              <RotaCard key={r.slug} rota={r} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum trecho encontrado para “{busca}”.
            </p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => setBusca("")}>
              Limpar busca
            </Button>
          </div>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-6">
          <div>
            <h2 className="font-display text-fluid-lg">
              Precisa de ida e volta ou de um trecho fora da lista?
            </h2>
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
