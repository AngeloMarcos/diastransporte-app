import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Snowflake,
  UserRound,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { RotaCard } from "@/components/site/RotaCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatBRL, getRota, precoFinal, rotas } from "@/data/rotas";
import { mensagemReserva, whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/transfers/$rota")({
  loader: ({ params }) => {
    const rota = getRota(params.rota);
    if (!rota) throw notFound();
    return { rota };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Trecho não encontrado — Dias Transporte" }, { name: "robots", content: "noindex" }],
      };
    }
    const { rota } = loaderData;
    const titulo = `Transfer ${rota.origem} → ${rota.destino} — Dias Transporte`;
    const desc = `${rota.resumo} A partir de ${formatBRL(rota.precoPequeno)} por veículo. Reserve pelo WhatsApp.`;
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: RotaDetalhe,
});

const diferenciais = [
  { icon: Snowflake, texto: "Veículos climatizados" },
  { icon: MapPin, texto: "Embarque no hotel ou aeroporto" },
  { icon: ShieldCheck, texto: "Motoristas especialistas no trajeto" },
];

const inclui = [
  "Motorista particular durante todo o trajeto",
  "Combustível e pedágios inclusos",
  "Ar-condicionado e água a bordo",
  "Acompanhamento do voo em embarques no aeroporto",
  "Paradas para banheiro e refeição no caminho",
];

function RotaDetalhe() {
  const { rota } = Route.useLoaderData();
  const [indice, setIndice] = useState(0);
  const [data, setData] = useState("");
  const [periodo, setPeriodo] = useState<"dia" | "noite">("dia");
  const [carro, setCarro] = useState<"pequeno" | "grande">("pequeno");
  const [passageiros, setPassageiros] = useState(2);

  const maxPassageiros = carro === "pequeno" ? 4 : 5;
  const preco = precoFinal(rota, carro, periodo);
  const temNoite = rota.precoPequenoNoite !== undefined || rota.precoGrandeNoite !== undefined;

  const relacionadas = useMemo(
    () => rotas.filter((r) => r.slug !== rota.slug).slice(0, 3),
    [rota.slug],
  );

  const link = whatsappLink(
    mensagemReserva({
      rota: `${rota.origem} → ${rota.destino}`,
      data: data || undefined,
      periodo: periodo === "noite" ? "Noite (18h às 5h)" : "Dia",
      carro: carro === "pequeno" ? "Carro pequeno (até 4)" : "Carro grande (até 5)",
      passageiros,
      valor: preco ? formatBRL(preco) : "sob consulta",
    }),
  );

  return (
    <div className="min-h-screen">
      <Header />

      <div className="mx-auto max-w-6xl px-4 pt-8">
        <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>
          <span>›</span>
          <Link to="/transfers" className="hover:text-foreground">
            Transfers
          </Link>
          <span>›</span>
          <span className="text-foreground">
            {rota.origem} → {rota.destino}
          </span>
        </nav>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">
            {rota.origem} <span className="text-primary">→</span> {rota.destino}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{rota.resumo}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {diferenciais.map((d) => (
              <span
                key={d.texto}
                className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              >
                <d.icon className="size-3.5 text-primary" /> {d.texto}
              </span>
            ))}
          </div>

          <div className="relative mt-6 overflow-hidden rounded-lg border border-border">
            <img
              src={rota.galeria[indice]}
              alt={`Transfer ${rota.origem} para ${rota.destino} — foto ${indice + 1}`}
              className="aspect-[16/10] w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3">
              <button
                type="button"
                aria-label="Foto anterior"
                onClick={() => setIndice((i) => (i === 0 ? rota.galeria.length - 1 : i - 1))}
                className="rounded-sm bg-background/80 p-2 backdrop-blur"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="rounded-sm bg-background/80 px-2 py-1 text-xs backdrop-blur">
                {indice + 1}/{rota.galeria.length}
              </span>
              <button
                type="button"
                aria-label="Próxima foto"
                onClick={() => setIndice((i) => (i + 1) % rota.galeria.length)}
                className="rounded-sm bg-background/80 p-2 backdrop-blur"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Duração</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm">
                <Clock className="size-4 text-primary" /> {rota.duracao}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Distância</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-primary" /> {rota.distancia}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Saídas</p>
              <p className="mt-1 text-sm">Horário livre, definido por você</p>
            </div>
          </div>

          <h2 className="mt-12 font-display text-2xl">Sobre o trecho</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{rota.descricao}</p>

          <h2 className="mt-10 font-display text-2xl">Tarifário 2026</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Carro pequeno</th>
                  <th className="px-4 py-3">Carro grande</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-3">Dia</td>
                  <td className="px-4 py-3">{formatBRL(rota.precoPequeno)}</td>
                  <td className="px-4 py-3">
                    {rota.precoGrande ? formatBRL(rota.precoGrande) : "Sob consulta"}
                  </td>
                </tr>
                {temNoite && (
                  <tr className="border-t border-border">
                    <td className="px-4 py-3">Noite (18h às 5h)</td>
                    <td className="px-4 py-3">
                      {formatBRL(rota.precoPequenoNoite ?? rota.precoPequeno)}
                    </td>
                    <td className="px-4 py-3">
                      {rota.precoGrandeNoite ?? rota.precoGrande
                        ? formatBRL((rota.precoGrandeNoite ?? rota.precoGrande) as number)
                        : "Sob consulta"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Valores por veículo, não por pessoa. {rota.ida_e_volta ? "Trecho disponível nos dois sentidos." : "Trecho de ida."}
          </p>

          <h2 className="mt-10 font-display text-2xl">Inclui</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {inclui.map((i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {i}
              </li>
            ))}
          </ul>

          <h2 className="mt-10 font-display text-2xl">Locais de embarque</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {rota.embarque.map((e) => (
              <li key={e} className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" /> {e}
              </li>
            ))}
          </ul>

          <h2 className="mt-10 font-display text-2xl">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="1">
              <AccordionTrigger>O valor é por pessoa ou por carro?</AccordionTrigger>
              <AccordionContent>
                Por carro. O veículo é exclusivo do seu grupo, independente do número de passageiros
                (até o limite de cada porte).
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="2">
              <AccordionTrigger>Vocês buscam no aeroporto de madrugada?</AccordionTrigger>
              <AccordionContent>
                Sim. Acompanhamos o status do voo e o motorista aguarda no desembarque. Entre 18h e
                5h aplica-se a tarifa noturna quando houver.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="3">
              <AccordionTrigger>Como funciona o pagamento?</AccordionTrigger>
              <AccordionContent>
                Combinamos no WhatsApp: Pix, dinheiro ou cartão na maquininha do motorista. Sem taxa
                adicional escondida.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="4">
              <AccordionTrigger>Posso cancelar?</AccordionTrigger>
              <AccordionContent>
                Cancelamento sem custo até 24h antes do embarque. Alterações de horário podem ser
                feitas conforme disponibilidade.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Valor total</p>
            <p className="mt-1 font-display text-4xl">
              {preco ? formatBRL(preco) : "Sob consulta"}
            </p>
            <p className="text-xs text-muted-foreground">por veículo, até {maxPassageiros} passageiros</p>

            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="data">Data do embarque</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Período</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={periodo === "dia" ? "default" : "secondary"}
                    onClick={() => setPeriodo("dia")}
                  >
                    Dia
                  </Button>
                  <Button
                    type="button"
                    variant={periodo === "noite" ? "default" : "secondary"}
                    onClick={() => setPeriodo("noite")}
                  >
                    18h às 5h
                  </Button>
                </div>
              </div>

              <div>
                <Label>Veículo</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={carro === "pequeno" ? "default" : "secondary"}
                    onClick={() => {
                      setCarro("pequeno");
                      setPassageiros((p) => Math.min(p, 4));
                    }}
                  >
                    Pequeno
                  </Button>
                  <Button
                    type="button"
                    variant={carro === "grande" ? "default" : "secondary"}
                    onClick={() => setCarro("grande")}
                  >
                    Grande
                  </Button>
                </div>
              </div>

              <div>
                <Label>Passageiros</Label>
                <div className="mt-2 flex items-center justify-between rounded-sm border border-border px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <UserRound className="size-4 text-primary" /> {passageiros}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Remover passageiro"
                      onClick={() => setPassageiros((p) => Math.max(1, p - 1))}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Adicionar passageiro"
                      onClick={() => setPassageiros((p) => Math.min(maxPassageiros, p + 1))}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Button asChild className="mt-6 w-full bg-whats text-whats-foreground hover:bg-whats/90">
              <a href={link} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> Reservar pelo WhatsApp
              </a>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Confirmação imediata no WhatsApp. Cancelamento grátis até 24h antes.
            </p>
          </div>
        </aside>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl">Continue explorando</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {relacionadas.map((r) => (
            <RotaCard key={r.slug} rota={r} />
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
