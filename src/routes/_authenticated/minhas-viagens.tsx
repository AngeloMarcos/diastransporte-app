import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Car, MapPin, MessageCircle, RefreshCw, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { StatusBadge } from "@/components/site/StatusBadge";
import { MinhasViagensSkeleton } from "@/components/site/Skeletons";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/data/rotas";
import { useAuth } from "@/hooks/useAuth";
import { cancelarMinhaViagem, listarMinhasViagens } from "@/lib/dados";
import { whatsappLink } from "@/lib/whatsapp";
import type { AgendamentoRow } from "@/lib/dados-tipos";

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

// Status que ainda podem virar uma corrida de verdade — o resto é histórico.
const STATUS_ATIVOS = new Set(["pendente", "confirmado"]);

function MinhasViagens() {
  const { user } = useAuth();
  const usuarioId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["meus-agendamentos", usuarioId],
    queryFn: () => listarMinhasViagens(usuarioId),
    enabled: Boolean(usuarioId),
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => cancelarMinhaViagem(id, usuarioId),
    onSuccess: () => {
      toast.success("Reserva cancelada.");
      void queryClient.invalidateQueries({ queryKey: ["meus-agendamentos", usuarioId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível cancelar."),
  });

  const proximas = (data ?? []).filter((a) => STATUS_ATIVOS.has(a.status));
  const historico = (data ?? []).filter((a) => !STATUS_ATIVOS.has(a.status));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-gutter py-section">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-fluid-2xl">Minhas viagens</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Seus agendamentos e o status de cada um.
            </p>
          </div>
          <Button asChild>
            <Link to="/transfers">Agendar nova corrida</Link>
          </Button>
        </div>

        {isLoading && <MinhasViagensSkeleton />}

        {isError && (
          <div className="mt-10 rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Não foi possível carregar suas viagens."}
            </p>
            <Button className="mt-4" onClick={() => void refetch()}>
              <RefreshCw className="size-4" /> Tentar de novo
            </Button>
          </div>
        )}

        {!isLoading && !isError && !data?.length && (
          <div className="mt-10 rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Você ainda não agendou nenhuma corrida.</p>
            <Button asChild className="mt-4">
              <Link to="/transfers">Ver trechos disponíveis</Link>
            </Button>
          </div>
        )}

        {!isLoading && !isError && Boolean(data?.length) && (
          <div className="mt-8 space-y-10">
            <section className="space-y-4">
              <h2 className="text-fluid-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Próximas
              </h2>
              {proximas.length ? (
                <div className="space-y-4">
                  {proximas.map((a) => (
                    <ViagemCard
                      key={a.id}
                      agendamento={a}
                      onCancelar={() => {
                        if (window.confirm(`Cancelar a reserva de ${a.trecho}?`)) {
                          cancelar.mutate(a.id);
                        }
                      }}
                      cancelando={cancelar.isPending}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma viagem futura agendada.</p>
              )}
            </section>

            {historico.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-fluid-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Histórico
                </h2>
                <div className="space-y-4">
                  {historico.map((a) => (
                    <ViagemCard key={a.id} agendamento={a} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ViagemCard({
  agendamento: a,
  onCancelar,
  cancelando,
}: {
  agendamento: AgendamentoRow;
  onCancelar?: () => void;
  cancelando?: boolean;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-fluid-base break-words">{a.trecho}</h3>
        <StatusBadge status={a.status} />
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
      {a.observacoes ? <p className="mt-3 text-sm text-muted-foreground">{a.observacoes}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <a
            href={whatsappLink(`Olá! Quero falar sobre meu agendamento: ${a.trecho}.`)}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="size-4" /> Falar no WhatsApp
          </a>
        </Button>
        {onCancelar && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={cancelando}
            onClick={onCancelar}
          >
            <XCircle className="size-4" /> Cancelar reserva
          </Button>
        )}
      </div>
    </article>
  );
}
