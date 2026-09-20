import { createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EMPRESA, fotos } from "@/data/rotas";
import { criarLead } from "@/lib/dados";
import { linkTelefone, novoLeadSchema } from "@/lib/leads";
import { whatsappLink } from "@/lib/whatsapp";
import { listConteudo } from "@/lib/conteudo.functions";
import { mapearConteudo, texto } from "@/lib/conteudo";

export const Route = createFileRoute("/contato")({
  loader: () => listConteudo(),

  head: () => ({
    meta: [
      { title: "Contato e atendimento — Dias Transporte" },
      {
        name: "description",
        content: `Fale com a Dias Transporte pelo WhatsApp ${EMPRESA.whatsappLabel}. Atendimento: ${EMPRESA.horario.toLowerCase()}, para transfers em São Luís e Lençóis Maranhenses.`,
      },
      { property: "og:title", content: "Contato — Dias Transporte" },
      {
        property: "og:description",
        content: "Atendimento diário pelo WhatsApp para reservas de transfer no Maranhão.",
      },
    ],
  }),
  component: Contato,
});

function Contato() {
  const conteudo = mapearConteudo(Route.useLoaderData());
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [website, setWebsite] = useState(""); // isca anti-robô
  const [erro, setErro] = useState("");
  const [trecho, setTrecho] = useState("");
  const [data, setData] = useState("");
  const [obs, setObs] = useState("");

  const mensagem = [
    `Olá, ${EMPRESA.nome}!`,
    nome && `Meu nome é ${nome}.`,
    telefone && `Telefone: ${telefone}`,
    trecho && `Trecho: ${trecho}`,
    data && `Data: ${data}`,
    obs && `Observações: ${obs}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="min-h-screen">
      <Header />

      <section className="relative border-b border-border">
        <img
          src={texto(conteudo, "contato_intro", "imagem", fotos.cronosNoite)}
          alt="Carro da Dias Transporte em embarque noturno"
          width={1920}
          height={1080}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-center"
        />

        <div className="absolute inset-0 overlay-escuro" />
        <div className="relative mx-auto max-w-6xl px-4 py-section">
          <h1 className="font-display text-fluid-2xl">
            {texto(conteudo, "contato_intro", "titulo", "Fale com a gente")}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            {texto(
              conteudo,
              "contato_intro",
              "texto",
              "Atendemos voos de qualquer horário, inclusive na madrugada. Mande o trecho e a data que confirmamos a disponibilidade.",
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-section lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-fluid-lg">Atendimento</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary" />{" "}
                <a
                  href={linkTelefone(EMPRESA.whatsappLabel)}
                  className="underline-offset-4 hover:text-foreground hover:underline"
                >
                  {EMPRESA.whatsappLabel}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-primary" /> {EMPRESA.horario} ({EMPRESA.horarioObs})
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> Base em {EMPRESA.base}
              </li>
            </ul>
            <Button
              asChild
              className="mt-6 w-full bg-whats text-whats-foreground hover:bg-whats/90"
            >
              <a
                href={whatsappLink("Olá! Quero informações sobre transfer.")}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" /> Abrir conversa no WhatsApp
              </a>
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            <h2 className="font-display text-fluid-lg text-foreground">Área de atendimento</h2>
            <p className="mt-3">
              São Luís, Barreirinhas, Santo Amaro do Maranhão, Parnaíba, Barra Grande e
              Jericoacoara. Trechos fora dessa lista são orçados sob consulta.
            </p>
          </div>
        </div>

        <form
          className="rounded-lg border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            const lead = { nome, telefone, trecho, dataViagem: data, observacoes: obs, website };
            const validado = novoLeadSchema.safeParse(lead);
            if (!validado.success) {
              setErro(validado.error.issues[0]?.message ?? "Confira os dados informados.");
              return;
            }
            setErro("");
            // Abre o WhatsApp NA HORA (dentro do clique — depois de um await o
            // navegador bloquearia a janela) e grava o lead em paralelo. Se a
            // gravação falhar, o pedido já foi pro WhatsApp: não vira erro.
            window.open(whatsappLink(mensagem), "_blank", "noopener");
            void criarLead(lead)
              .then((r) => {
                if (r.salvo) toast.success("Pedido registrado. Já já falamos com você!");
              })
              .catch(() => undefined);
          }}
          noValidate
        >
          <h2 className="font-display text-fluid-lg">Pedir orçamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha e enviamos direto para o nosso WhatsApp.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="nome">Seu nome</Label>
              <Input
                id="nome"
                autoComplete="name"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Seu WhatsApp ou telefone</Label>
              <Input
                id="telefone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                placeholder="(98) 98150-6268"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                aria-invalid={Boolean(erro)}
                className="mt-2"
              />
            </div>
            {/* Isca: escondido de quem usa a tela e de leitor de tela; robô que
                preenche tudo cai aqui e o servidor descarta o pedido. */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="website">Não preencha este campo</label>
              <input
                id="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="trecho">Trecho desejado</Label>
              <Input
                id="trecho"
                placeholder="Ex: São Luís → Barreirinhas"
                value={trecho}
                onChange={(e) => setTrecho(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="data">Data da viagem</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="obs">Observações</Label>
              <Textarea
                id="obs"
                rows={4}
                placeholder="Nº de passageiros, bagagem, horário do voo..."
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          {erro && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {erro}
            </p>
          )}

          <Button
            type="submit"
            className="mt-6 w-full bg-whats text-whats-foreground hover:bg-whats/90"
          >
            <MessageCircle className="size-4" /> Enviar pelo WhatsApp
          </Button>
        </form>
      </section>

      <Footer />
    </div>
  );
}
