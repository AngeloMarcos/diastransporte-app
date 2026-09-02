import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Car, CheckCircle2, MapPin, MessageCircle, Users } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { StatusBadge } from "@/components/site/StatusBadge";
import { MinhasViagensSkeleton } from "@/components/site/Skeletons";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/data/rotas";
import { useAuth } from "@/hooks/useAuth";
import { concluirCorridaComoMotorista, listarCorridasMotorista } from "@/lib/dados";
import { podeConcluir, STATUS_ATIVOS } from "@/lib/status";
import { whatsappLink } from "@/lib/whatsapp";
import type { AgendamentoRow } from "@/lib/dados-tipos";

export const Route = createFileRoute("/_authenticated/motorista")({
  head: () => ({
    meta: [
      { title: "Minhas corridas — Dias Transporte" },
      { name: "description", content: "Corridas atribuídas a você na Dias Transporte." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MotoristaPage,
});

function MotoristaPage() {
  const { user, isMotorista, carregando } = useAuth();
  const navigate = useNavigate();
  const motoristaId = user?.id ?? "";
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!carregando && !isMotorista) {
      toast.error("Área restrita a motoristas.");
      void navigate({ to: "/minhas-viagens", replace: true });
    }
  }, [carregando, isMotorista, navigate]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["minhas-corridas", motoristaId],
    queryFn: () => listarCorridasMotorista(motoristaId),
    enabled: Boolean(motoristaId) && isMotorista,
  });

  const concluir = useMutation({
    mutationFn: (id: string) => concluirCorridaComoMotorista(id, motoristaId),
    onSuccess: () => {
      toast.success("Corrida marcada como concluída.");
      void queryClient.invalidateQueries({ queryKey: ["minhas-corridas", motoristaId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível concluir."),
  });

  if (carregando || !isMotorista) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-5xl px-4 py-20 text-sm text-muted-foreground">
          Verificando permissões…
        </main>
        <Footer />
      </div>
    );
  }

  const proximas = (data ?? []).filter((a) => STATUS_ATIVOS.has(a.status));
  const historico = (data ?? []).filter((a) => !STATUS_ATIVOS.has(a.status));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-gutter py-section">
        <div>
          <h1 className="font-display text-fluid-2xl">Minhas corridas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Corridas que o escritório atribuiu a você.
          </p>
        </div>

        {isLoading && <MinhasViagensSkeleton />}

        {isError && (
          <div className="mt-10 rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Não foi possível carregar suas corridas."}
            </p>
            <Button className="mt-4" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          </div>
        )}

        {!isLoading && !isError && !data?.length && (
          <div className="mt-10 rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma corrida atribuída a você ainda.</p>
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
                    <CorridaCard
                      key={a.id}
                      agendamento={a}
                      onConcluir={() => {
                        if (window.confirm(`Marcar "${a.trecho}" como concluída?`)) {
                          concluir.mutate(a.id);
                        }
                      }}
                      concluindo={concluir.isPending}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma corrida futura atribuída.</p>
              )}
            </section>

            {historico.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-fluid-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Histórico
                </h2>
                <div className="space-y-4">
                  {historico.map((a) => (
                    <CorridaCard key={a.id} agendamento={a} />
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

function CorridaCard({
  agendamento: a,
  onConcluir,
  concluindo,
}: {
  agendamento: AgendamentoRow;
  onConcluir?: () => void;
  concluindo?: boolean;
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
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {a.contato_telefone ? (
          <Button asChild size="sm" variant="secondary">
            <a
              href={whatsappLink(`Olá ${a.contato_nome ?? ""}! Sou o motorista da sua corrida.`)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4" /> Falar com o passageiro
            </a>
          </Button>
        ) : null}
        {onConcluir && podeConcluir(a.status) ? (
          <Button size="sm" disabled={concluindo} onClick={onConcluir}>
            <CheckCircle2 className="size-4" /> Concluir corrida
          </Button>
        ) : a.status === "pendente" ? (
          <p className="text-xs text-muted-foreground">Aguardando confirmação do escritório.</p>
        ) : null}
      </div>
    </article>
  );
}
