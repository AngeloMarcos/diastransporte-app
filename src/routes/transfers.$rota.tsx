import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Baby,
  CalendarCheck,
  CalendarOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Snowflake,
  Briefcase,
  UserRound,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { RotaCard } from "@/components/site/RotaCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { formatBRL, precoFinal, type Rota } from "@/data/rotas";
import { listRotas } from "@/lib/rotas.functions";
import { mensagemReserva, whatsappLink } from "@/lib/whatsapp";
import { adicionarAoCarrinho } from "@/lib/carrinho";
import { RotaDetalheSkeleton } from "@/components/site/Skeletons";
import { ErroCarregamento } from "@/components/site/ErroCarregamento";
import { origemAtual } from "@/lib/origem-atual.functions";
import logo from "@/assets/logo.jpeg";

const OUTRO_EMBARQUE = "outro";

export const Route = createFileRoute("/transfers/$rota")({
  loader: async ({ params }) => {
    const rotas = await listRotas();
    const rota = rotas.find((r) => r.slug === params.rota);
    if (!rota) throw notFound();
    return { rota, rotas, origem: await origemAtual() };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Trecho não encontrado — Dias Transporte" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { rota, origem } = loaderData;
    const titulo = `Transfer ${rota.origem} → ${rota.destino} — Dias Transporte`;
    const desc = `${rota.resumo} A partir de ${formatBRL(rota.precoPequeno)} por veículo. Reserve pelo WhatsApp.`;
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
        // Achado revisando SEO: nenhuma página tinha og:image/twitter:image
        // apesar de twitter:card=summary_large_image já estar declarado em
        // várias — todo link compartilhado no WhatsApp (o canal principal
        // do negócio) aparecia sem foto. Usa a logo como imagem provisória
        // (funciona, mas é quadrada — uma arte 1200x630 renderizaria
        // melhor no card horizontal). URL absoluta obrigatória: crawlers
        // de preview buscam a página de fora, não resolvem caminho
        // relativo ao navegador de quem compartilhou.
        ...(origem
          ? [
              { property: "og:image", content: `${origem}${logo}` },
              { name: "twitter:image", content: `${origem}${logo}` },
            ]
          : []),
        // Achado revisando SEO: nenhuma página do site tinha dado
        // estruturado — esta já tem um FAQ pronto (visível no Accordion
        // logo abaixo, mesma constante `faq`) que pode virar rich result
        // no Google. 'script:ld+json' é suportado nativamente pelo
        // TanStack Router (vira <script type="application/ld+json"> no
        // <head>, sem lib extra).
        {
          "script:ld+json": {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({
              "@type": "Question",
              name: f.pergunta,
              acceptedAnswer: { "@type": "Answer", text: f.resposta },
            })),
          },
        },
      ],
    };
  },
  component: RotaDetalhe,
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: () => (
    <div className="min-h-screen">
      <Header />
      <RotaDetalheSkeleton />
      <Footer />
    </div>
  ),
  errorComponent: () => (
    <ErroCarregamento
      titulo="Não conseguimos carregar este trecho"
      descricao="A conexão pode ter oscilado. Tente de novo ou veja a lista completa de transfers."
      voltarPara="/transfers"
      voltarLabel="Ver todos os transfers"
    />
  ),
  notFoundComponent: () => (
    <ErroCarregamento
      titulo="Trecho não encontrado"
      descricao="Esse trecho saiu do ar ou o endereço está incorreto. Veja os trechos disponíveis."
      voltarPara="/transfers"
      voltarLabel="Ver todos os transfers"
    />
  ),
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

// Uma fonte só pro Accordion visível e pro FAQPage (JSON-LD) no head() —
// achado revisando SEO: dado estruturado só vale a pena se bater com o que
// a pessoa realmente vê na página, então não duplica o texto em dois lugares.
const faq = [
  {
    pergunta: "O valor é por pessoa ou por carro?",
    resposta:
      "Por carro. O veículo é exclusivo do seu grupo, independente do número de passageiros (até o limite de cada porte).",
  },
  {
    pergunta: "Vocês buscam no aeroporto de madrugada?",
    resposta:
      "Sim. Acompanhamos o status do voo e o motorista aguarda no desembarque. Entre 18h e 5h aplica-se a tarifa noturna quando houver.",
  },
  {
    pergunta: "Como funciona o pagamento?",
    resposta:
      "Combinamos no WhatsApp: Pix, dinheiro ou cartão na maquininha do motorista. Sem taxa adicional escondida.",
  },
  {
    pergunta: "Posso cancelar?",
    resposta:
      "Cancelamento sem custo até 24h antes do embarque. Alterações de horário podem ser feitas conforme disponibilidade.",
  },
];

const politicas = [
  {
    icon: Briefcase,
    titulo: "Bagagem",
    texto:
      "Uma mala grande por passageiro no porta-malas, mais item de mão. Pranchas, bicicletas ou excesso de bagagem: avise ao reservar para confirmarmos o espaço no veículo.",
  },
  {
    icon: Baby,
    titulo: "Crianças",
    texto:
      "Crianças de colo (até 2 anos) não pagam. Cadeirinha ou bebê-conforto sob solicitação — informe a idade nas observações da reserva.",
  },
  {
    icon: CalendarOff,
    titulo: "Cancelamento",
    texto:
      "Grátis até 24h antes do embarque. Depois disso, fale com a gente pelo WhatsApp para reagendar conforme disponibilidade.",
  },
];

function RotaDetalhe() {
  const loaderData = Route.useLoaderData() as { rota: Rota; rotas: Rota[]; origem: string };
  const { rota, rotas } = loaderData;
  const navigate = useNavigate();
  const [indice, setIndice] = useState(0);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [periodo, setPeriodo] = useState<"dia" | "noite">("dia");
  const [carro, setCarro] = useState<"pequeno" | "grande">("pequeno");
  const [passageiros, setPassageiros] = useState(2);
  const [embarqueEscolha, setEmbarqueEscolha] = useState("");
  const [embarqueOutro, setEmbarqueOutro] = useState("");
  const [observacoes, setObservacoes] = useState("");
  // Achado revisando UX: no celular, o toast de campo faltando aparecia e
  // sumia sem indicar QUAL campo — a pessoa clicava "Adicionar" fixo no
  // rodapé sem saber que precisava rolar até a data ou o embarque.
  const dataRef = useRef<HTMLInputElement>(null);
  const embarqueRef = useRef<HTMLDivElement>(null);

  const maxPassageiros = carro === "pequeno" ? 4 : 5;
  const preco = precoFinal(rota, carro, periodo);
  const temNoite = rota.precoPequenoNoite !== undefined || rota.precoGrandeNoite !== undefined;
  // Achado revisando UX: "Grande" ficava selecionável mesmo em rotas sem
  // esse porte (precoGrande null) — só virava "Sob consulta" em silêncio,
  // sem indicar que a opção nem existe pra este trecho.
  const grandeDisponivel = rota.precoGrande !== null;
  // A zona ajuda a triagem, mas quem promete buscar na porta precisa do
  // endereço exato — combina os dois em vez de só um ou outro, pra não
  // obrigar o motorista a voltar a perguntar pelo WhatsApp depois.
  const embarqueLocal = [
    embarqueEscolha && embarqueEscolha !== OUTRO_EMBARQUE ? embarqueEscolha : null,
    embarqueOutro.trim() || null,
  ]
    .filter((v): v is string => Boolean(v))
    .join(" — ");
  const hojeISO = new Date().toISOString().slice(0, 10);

  const relacionadas = useMemo(
    () => rotas.filter((r: Rota) => r.slug !== rota.slug).slice(0, 3),
    [rotas, rota.slug],
  );

  const trecho = `${rota.origem} → ${rota.destino}`;

  /** Validação compartilhada por qualquer caminho de reserva (carrinho ou
   * WhatsApp direto) — achado revisando UX: "Reservar pelo WhatsApp" antes
   * não passava por aqui, então dava pra mandar mensagem sem data nem
   * embarque, direto contradizendo o aviso ao lado do campo de endereço. */
  function validarCampos(): boolean {
    if (!data) {
      toast.error("Escolha a data do embarque.");
      dataRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      dataRef.current?.focus();
      return false;
    }
    if (data < hojeISO) {
      toast.error("Escolha uma data a partir de hoje.");
      dataRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      dataRef.current?.focus();
      return false;
    }
    if (!embarqueLocal) {
      toast.error("Escolha (ou informe) o local de embarque.");
      embarqueRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }

  /** Único caminho que cria a reserva: joga no carrinho. */
  function adicionarItem(): boolean {
    if (!validarCampos()) return false;
    if (!rota.id) {
      toast.error("Esta rota está indisponível para reserva no momento.");
      return false;
    }
    adicionarAoCarrinho({
      slug: rota.slug,
      rotaId: rota.id,
      trecho,
      origem: rota.origem,
      destino: rota.destino,
      data,
      hora,
      periodo,
      carro,
      passageiros,
      embarqueLocal,
      observacoes,
      valor: preco ?? null,
    });
    return true;
  }

  function adicionarEContinuar() {
    if (!adicionarItem()) return;
    toast.success("Adicionado ao carrinho.", {
      action: { label: "Ver carrinho", onClick: () => void navigate({ to: "/carrinho" }) },
    });
  }

  /** Atalho: mesma função de adicionar + vai direto ao checkout. */
  function reservarAgora() {
    if (!adicionarItem()) return;
    void navigate({ to: "/carrinho" });
  }

  const link = whatsappLink(
    mensagemReserva({
      rota: `${rota.origem} → ${rota.destino}`,
      data: data || undefined,
      hora: hora || undefined,
      periodo: periodo === "noite" ? "Noite (18h às 5h)" : "Dia",
      carro: carro === "pequeno" ? "Carro pequeno (até 4)" : "Carro grande (até 5)",
      passageiros,
      embarque: embarqueLocal || undefined,
      valor: preco ? formatBRL(preco) : "sob consulta",
    }),
  );

  /** Não passa mais direto pelo href do link — exige a mesma validação de
   * data/embarque que "Adicionar ao carrinho" já exige, senão a mensagem
   * chega faltando justo o que o motorista precisa pra não perguntar de
   * novo. */
  function reservarPeloWhatsapp() {
    if (!validarCampos()) return;
    window.open(link, "_blank", "noreferrer");
  }

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
          <h1 className="font-display text-fluid-2xl leading-tight">
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
              width={960}
              height={600}
              decoding="async"
              fetchPriority={indice === 0 ? "high" : "auto"}
              className="aspect-[16/10] w-full object-cover object-center"
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
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Distância
              </p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-primary" /> {rota.distancia}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Saídas</p>
              <p className="mt-1 text-sm">Horário livre, definido por você</p>
            </div>
          </div>

          <h2 className="mt-12 font-display text-fluid-lg">Sobre o trecho</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{rota.descricao}</p>

          <h2 className="mt-10 font-display text-fluid-lg">Tarifário 2026</h2>
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
                      {(rota.precoGrandeNoite ?? rota.precoGrande)
                        ? formatBRL((rota.precoGrandeNoite ?? rota.precoGrande) as number)
                        : "Sob consulta"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Valores por veículo, não por pessoa.{" "}
            {rota.ida_e_volta ? "Trecho disponível nos dois sentidos." : "Trecho de ida."}
          </p>

          <h2 className="mt-10 font-display text-fluid-lg">Inclui</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {inclui.map((i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {i}
              </li>
            ))}
          </ul>

          <h2 className="mt-10 font-display text-fluid-lg">Locais de embarque</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {rota.embarque.map((e: string) => (
              <li key={e} className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" /> {e}
              </li>
            ))}
          </ul>

          <h2 className="mt-10 font-display text-fluid-lg">Políticas de viagem</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {politicas.map((p) => (
              <div key={p.titulo} className="rounded-lg border border-border bg-card p-4">
                <p.icon className="size-5 text-primary" />
                <p className="mt-2 text-sm font-medium">{p.titulo}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.texto}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-10 font-display text-fluid-lg">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="mt-4">
            {faq.map((f, i) => (
              <AccordionItem key={f.pergunta} value={String(i + 1)}>
                <AccordionTrigger>{f.pergunta}</AccordionTrigger>
                <AccordionContent>{f.resposta}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* order-first no celular: achado revisando UX — o formulário de
            reserva vinha DEPOIS de galeria/tarifas/FAQ na ordem do DOM, e
            sem grid-template em telas pequenas isso significava rolar a
            página inteira antes de conseguir reservar. lg:order-none
            restaura a ordem natural (conteúdo à esquerda, formulário à
            direita) a partir do breakpoint onde o grid de 2 colunas entra. */}
        <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Valor total
            </p>
            <p className="mt-1 font-display text-4xl">
              {preco ? formatBRL(preco) : "Sob consulta"}
            </p>
            <p className="text-xs text-muted-foreground">
              por veículo, até {maxPassageiros} passageiros
            </p>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="data">Data do embarque</Label>
                  {/* Sem "required": este input não está dentro de um <form>
                      de verdade (o botão "Adicionar" é onClick, não
                      submit), então o atributo nunca disparava a validação
                      nativa do navegador — achado revisando UX, era código
                      morto que sugeria uma garantia que não existia. A
                      validação real é validarCampos() acima. */}
                  <Input
                    id="data"
                    ref={dataRef}
                    type="date"
                    min={hojeISO}
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="hora">Horário</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Achado revisando UX: este toggle aparecia em toda rota, mas
                  só sao-luis-barreirinhas tem preço noturno de verdade —
                  nas outras 8, escolher "18h às 5h" mudava pro preço de dia
                  em silêncio (via precoFinal ?? fallback), sem indicar que
                  nada mudou. Esconder onde não existe é mais honesto que
                  deixar escolher uma opção que não faz diferença nenhuma. */}
              {temNoite && (
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
              )}

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
                    disabled={!grandeDisponivel}
                    title={
                      grandeDisponivel ? undefined : "Não oferecemos carro grande neste trecho"
                    }
                    onClick={() => setCarro("grande")}
                  >
                    Grande
                  </Button>
                </div>
                {!grandeDisponivel && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Carro grande não disponível para este trecho.
                  </p>
                )}
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

            <div className="mt-6" ref={embarqueRef}>
              <Label htmlFor="embarque">Zona de embarque</Label>
              <Select value={embarqueEscolha} onValueChange={setEmbarqueEscolha}>
                <SelectTrigger id="embarque" className="mt-2">
                  <SelectValue placeholder="De onde você sai?" />
                </SelectTrigger>
                <SelectContent>
                  {rota.embarque.map((local) => (
                    <SelectItem key={local} value={local}>
                      {local}
                    </SelectItem>
                  ))}
                  <SelectItem value={OUTRO_EMBARQUE}>Não está na lista</SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="endereco" className="mt-4 block">
                Endereço completo ou ponto de referência
              </Label>
              <Input
                id="endereco"
                value={embarqueOutro}
                onChange={(e) => setEmbarqueOutro(e.target.value)}
                placeholder="Ex: Hotel Pousada Mar Azul, Rua das Flores nº 123"
                maxLength={200}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Ajuda o motorista a te encontrar sem precisar perguntar de novo pelo WhatsApp.
              </p>
            </div>

            <div className="mt-4">
              <Label htmlFor="obs">Observações (opcional)</Label>
              <Input
                id="obs"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: voo G3 1234, cadeirinha de criança"
                maxLength={300}
                className="mt-2"
              />
            </div>

            <Button className="mt-4 w-full" onClick={adicionarEContinuar}>
              <ShoppingBag className="size-4" /> Adicionar ao carrinho
            </Button>

            <Button variant="secondary" className="mt-2 w-full" onClick={reservarAgora}>
              <CalendarCheck className="size-4" /> Reservar agora
            </Button>

            <Button
              className="mt-2 w-full bg-whats text-whats-foreground hover:bg-whats/90"
              onClick={reservarPeloWhatsapp}
            >
              <MessageCircle className="size-4" /> Reservar pelo WhatsApp
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              &quot;Reservar agora&quot; leva você direto ao carrinho para finalizar. Cancelamento
              grátis até 24h antes.
            </p>
          </div>
        </aside>
      </div>

      <section className="mx-auto max-w-6xl px-4 py-section">
        <h2 className="font-display text-fluid-lg">Continue explorando</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {relacionadas.map((r) => (
            <RotaCard key={r.slug} rota={r} />
          ))}
        </div>
      </section>

      {/* Barra fixa no rodapé (mobile): preço + adicionar sempre visíveis */}
      <div aria-hidden className="h-24 md:hidden" />
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+var(--safe-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Total por veículo
            </p>
            <p className="truncate font-display text-fluid-lg">
              {preco ? formatBRL(preco) : "Sob consulta"}
            </p>
          </div>
          <Button className="min-h-11 shrink-0" onClick={adicionarEContinuar}>
            <ShoppingBag className="size-4" /> Adicionar
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
