import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Car,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Save,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { StatusBadge } from "@/components/site/StatusBadge";
import { MinhasViagensSkeleton } from "@/components/site/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/data/rotas";
import { useAuth } from "@/hooks/useAuth";
import {
  concluirCorridaComoMotorista,
  listarCorridasMotorista,
  listarPedidosMotorista,
  meuFornecedor,
  salvarObservacaoMotorista,
  transicionarStatusPedidoMotorista,
} from "@/lib/dados";
import { MODO_VPS } from "@/lib/vps/config";
import { podeConcluir, STATUS_ATIVOS } from "@/lib/status";
import { PEDIDO_STATUS_META, formatarDataHora } from "@/lib/pedidos-status";
import { transicoesPermitidas, type PedidoStatus } from "@/lib/pedidos-transicoes";
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
  const { isMotorista, carregando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!carregando && !isMotorista) {
      toast.error("Área restrita a motoristas.");
      void navigate({ to: "/minhas-viagens", replace: true });
    }
  }, [carregando, isMotorista, navigate]);

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

  // Etapa 9 do roteiro da fusão: o modelo de motorista do despacho
  // (fornecedores + pedidos.fornecedor_id) substitui o antigo
  // (agendamentos.motorista_id) só em MODO_VPS, onde o despacho existe de
  // fato — checagem contra o banco de produção antes de trocar mostrou
  // zero uso real do modelo antigo (nenhum usuarios.motorista=true,
  // nenhuma atribuição pendente/confirmada), então a troca é segura. Fora
  // de MODO_VPS (Supabase) o despacho não existe, então mantém o painel
  // antigo funcionando — sem regressão pra quem ainda estiver nesse ramo.
  return MODO_VPS ? <PainelMotoristaDespacho /> : <PainelMotoristaLegado />;
}

// ------------------------------------------------------- modelo despacho
function PainelMotoristaDespacho() {
  const queryClient = useQueryClient();

  const { data: fornecedor, isLoading: carregandoFornecedor } = useQuery({
    queryKey: ["meu-fornecedor"],
    queryFn: () => meuFornecedor(),
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["minhas-corridas-despacho"],
    queryFn: () => listarPedidosMotorista(),
    enabled: Boolean(fornecedor),
  });

  if (carregandoFornecedor || (isLoading && Boolean(fornecedor))) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-4xl px-gutter py-section">
          <MinhasViagensSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  if (!fornecedor) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-4xl px-gutter py-section">
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sua conta está marcada como motorista, mas não tem um cadastro de fornecedor
              vinculado. Fale com o administrador.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const ATIVOS = new Set<string>([
    "pendente_liberacao",
    "liberada_rede",
    "motorista_atribuido",
    "aguardando_aceite_rede",
    "aceita_motorista",
    "em_atendimento",
  ]);
  const proximas = (data ?? []).filter((p) => ATIVOS.has(p.status));
  const historico = (data ?? []).filter((p) => !ATIVOS.has(p.status));

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-gutter py-section">
        <div>
          <h1 className="font-display text-fluid-2xl">Minhas corridas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Olá, {fornecedor.nome} — corridas que o escritório atribuiu a você.
          </p>
        </div>

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

        {!isError && !data?.length && (
          <div className="mt-10 rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma corrida atribuída a você ainda.</p>
          </div>
        )}

        {!isError && Boolean(data?.length) && (
          <div className="mt-8 space-y-10">
            <section className="space-y-4">
              <h2 className="text-fluid-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Próximas
              </h2>
              {proximas.length ? (
                <div className="space-y-4">
                  {proximas.map((p) => (
                    <PedidoMotoristaCard
                      key={p.id}
                      pedido={p}
                      onMudou={() =>
                        void queryClient.invalidateQueries({
                          queryKey: ["minhas-corridas-despacho"],
                        })
                      }
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
                  {historico.map((p) => (
                    <PedidoMotoristaCard
                      key={p.id}
                      pedido={p}
                      onMudou={() =>
                        void queryClient.invalidateQueries({
                          queryKey: ["minhas-corridas-despacho"],
                        })
                      }
                    />
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

type PedidoMotorista = Awaited<ReturnType<typeof listarPedidosMotorista>>[number];

function PedidoMotoristaCard({
  pedido: p,
  onMudou,
}: {
  pedido: PedidoMotorista;
  onMudou: () => void;
}) {
  const status = p.status as PedidoStatus;
  const transicoes = transicoesPermitidas(status, "motorista");
  const [obs, setObs] = useState(p.observacao_motorista ?? "");

  const mudarStatus = useMutation({
    mutationFn: (novoStatus: PedidoStatus) => transicionarStatusPedidoMotorista(p.id, novoStatus),
    onSuccess: () => {
      toast.success("Status atualizado.");
      onMudou();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao mudar status."),
  });

  const salvarObs = useMutation({
    mutationFn: () => salvarObservacaoMotorista(p.id, obs),
    onSuccess: () => {
      toast.success("Observação salva.");
      onMudou();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar observação."),
  });

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-fluid-base break-words">{p.passageiro_nome}</h3>
        <Badge variant="outline" className={PEDIDO_STATUS_META[status].badgeClass}>
          {PEDIDO_STATUS_META[status].label}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3.5" /> {formatarDataHora(p.data_hora_encontro)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Car className="size-3.5" /> {p.direcao === "IN" ? "Chegada" : "Saída"}
        </span>
        <span>{p.cidade_atendimento}</span>
      </div>
      {(p.ponto_partida ?? p.ponto_chegada) ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5" />
          {[p.ponto_partida, p.ponto_chegada].filter(Boolean).join(" → ")}
        </p>
      ) : null}
      {p.hotel ? <p className="mt-1 text-xs text-muted-foreground">Hotel: {p.hotel}</p> : null}
      {p.numero_voo ? (
        <p className="mt-1 text-xs text-muted-foreground">Voo: {p.numero_voo}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {p.passageiro_telefone ? (
          <Button asChild size="sm" variant="secondary">
            <a
              href={whatsappLink(`Olá ${p.passageiro_nome}! Sou o motorista da sua corrida.`)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4" /> Falar com o passageiro
            </a>
          </Button>
        ) : null}
        {transicoes.length > 0 && (
          <Select
            onValueChange={(v) => mudarStatus.mutate(v as PedidoStatus)}
            disabled={mudarStatus.isPending}
          >
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Mudar status" />
            </SelectTrigger>
            <SelectContent>
              {transicoes.map((s) => (
                <SelectItem key={s} value={s}>
                  {PEDIDO_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <Label className="text-xs">Observação pra a equipe</Label>
        <Textarea
          className="mt-2"
          rows={2}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex.: passageiro atrasou 20min, tudo certo no embarque."
        />
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          onClick={() => salvarObs.mutate()}
          disabled={salvarObs.isPending || obs === (p.observacao_motorista ?? "")}
        >
          {salvarObs.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar observação
        </Button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------- modelo antigo
// (agendamentos.motorista_id) — mantido pro ramo Supabase, onde o despacho
// não existe. Ver comentário em MotoristaPage acima.
function PainelMotoristaLegado() {
  const { user } = useAuth();
  const motoristaId = user?.id ?? "";
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["minhas-corridas", motoristaId],
    queryFn: () => listarCorridasMotorista(motoristaId),
    enabled: Boolean(motoristaId),
  });

  const concluir = useMutation({
    mutationFn: (id: string) => concluirCorridaComoMotorista(id, motoristaId),
    onSuccess: () => {
      toast.success("Corrida marcada como concluída.");
      void queryClient.invalidateQueries({ queryKey: ["minhas-corridas", motoristaId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível concluir."),
  });

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
                    <CorridaCardLegado
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
                    <CorridaCardLegado key={a.id} agendamento={a} />
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

function CorridaCardLegado({
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
