import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Car, MapPin, MessageCircle, Users } from "lucide-react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/data/rotas";
import { whatsappLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/minhas-viagens")({
  head: () => ({
    meta: [
      { title: "Minhas viagens — Dias Transporte" },
      { name: "description", content: "Acompanhe seus transfers agendados com a Dias Transporte." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Minhas viagens — Dias Transporte" },
      { property: "og:description", content: "Área do cliente Dias Transporte." },
    ],
  }),
  component: MinhasViagens,
});

const rotuloStatus: Record<string, string> = {
  pendente: "Aguardando confirmação",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function MinhasViagens() {
  const { data, isLoading } = useQuery({
    queryKey: ["meus-agendamentos"],
    queryFn: () => listarMinhasViagens(usuarioId),
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">Minhas viagens</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Seus agendamentos e o status de cada um.
            </p>
          </div>
          <Button asChild>
            <Link to="/transfers">Agendar nova corrida</Link>
          </Button>
        </div>

        {isLoading && <p className="mt-10 text-sm text-muted-foreground">Carregando…</p>}

        {!isLoading && (!data || data.length === 0) && (
          <div className="mt-10 rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Você ainda não agendou nenhuma corrida.</p>
            <Button asChild className="mt-4">
              <Link to="/transfers">Ver trechos disponíveis</Link>
            </Button>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {data?.map((a) => (
            <article key={a.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-display text-lg">{a.trecho}</h2>
                <span className="rounded-sm border border-border px-2 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  {rotuloStatus[a.status] ?? a.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" /> {a.data_viagem ?? "data a combinar"}
                  {a.hora ? ` · ${a.hora}` : ""}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Car className="size-3.5" /> Carro {a.carro} · {a.periodo}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" /> {a.passageiros} passageiro(s)
                </span>
                {a.valor ? <span>{formatBRL(a.valor)}</span> : null}
              </div>
              {a.embarque_local ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" /> Embarque: {a.embarque_local}
                </p>
              ) : null}
              {a.observacoes ? (
                <p className="mt-3 text-sm text-muted-foreground">{a.observacoes}</p>
              ) : null}
              <Button asChild size="sm" variant="secondary" className="mt-4">
                <a
                  href={whatsappLink(`Olá! Quero falar sobre meu agendamento: ${a.trecho}.`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="size-4" /> Falar no WhatsApp
                </a>
              </Button>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
