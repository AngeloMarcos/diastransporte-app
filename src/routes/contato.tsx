import { createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EMPRESA, fotos } from "@/data/rotas";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato e atendimento — Dias Transporte" },
      {
        name: "description",
        content:
          "Fale com a Dias Transporte pelo WhatsApp (98) 98150-6268. Atendimento todos os dias, das 6h às 22h, para transfers em São Luís e Lençóis Maranhenses.",
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
  const [nome, setNome] = useState("");
  const [trecho, setTrecho] = useState("");
  const [data, setData] = useState("");
  const [obs, setObs] = useState("");

  const mensagem = [
    `Olá, ${EMPRESA.nome}!`,
    nome && `Meu nome é ${nome}.`,
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
          src={fotos.cronosNoite}
          alt="Carro da Dias Transporte em embarque noturno"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 overlay-escuro" />
        <div className="relative mx-auto max-w-6xl px-4 py-20">
          <h1 className="font-display text-4xl sm:text-5xl">Fale com a gente</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Atendemos voos de qualquer horário, inclusive na madrugada. Mande o trecho e a data que
            confirmamos a disponibilidade.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-xl">Atendimento</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary" /> {EMPRESA.whatsappLabel}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-4 text-primary" /> Todos os dias, 6h às 22h (embarques 24h
                combinados)
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
            <h2 className="font-display text-xl text-foreground">Área de atendimento</h2>
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
            window.open(whatsappLink(mensagem), "_blank", "noopener");
          }}
        >
          <h2 className="font-display text-xl">Pedir orçamento</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha e enviamos direto para o nosso WhatsApp.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="nome">Seu nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-2"
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
