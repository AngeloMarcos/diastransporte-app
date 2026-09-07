import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Building2,
  CalendarCheck,
  Car,
  Check,
  FileSpreadsheet,
  FileText,
  KeyRound,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Radio,
  Route as RouteIcon,
  Save,
  Search,
  ShieldAlert,
  Tag,
  Trash2,
  Truck,
  Upload,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { StatusBadge } from "@/components/site/StatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  atribuirMotorista,
  atribuirMotoristaPedido,
  atualizarCanalVenda,
  atualizarCategoriaVeiculo,
  atualizarEmpresaCliente,
  atualizarStatusAgendamento,
  criarBlocoConteudo,
  criarCanalVenda,
  criarCategoriaVeiculo,
  criarEmpresaCliente,
  criarFotoGaleria,
  criarNovoMotorista,
  criarPedido,
  criarRota,
  criarVeiculoFrota,
  definirAdmin,
  definirMotorista,
  enviarImagem as uploadImagem,
  importarPedidos,
  listarAgendamentos,
  listarCanaisVenda,
  listarCategoriasVeiculo,
  listarConteudoAdmin,
  listarEmpresasClientes,
  listarFornecedores,
  listarFrotaGaleriaAdmin,
  listarFrotaVeiculosAdmin,
  listarPedidosAdmin,
  listarRotasAdmin,
  listarUsuarios,
  redefinirSenha,
  removerAgendamento,
  removerBlocoConteudo,
  removerCadastroMotorista,
  removerFotoGaleria,
  removerRota,
  removerVeiculoFrota,
  salvarBlocoConteudo,
  salvarFotoGaleria,
  salvarRota,
  salvarVeiculoFrota,
  transicionarStatusPedido,
  verificarCodigosExistentes,
  type Fornecedor,
} from "@/lib/dados";
import type { PedidoImportRow } from "@/lib/vps/dados-despacho.functions";
import { useAuth } from "@/hooks/useAuth";
import { MODO_VPS } from "@/lib/vps/config";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/data/rotas";
import {
  pedirPermissaoNotificacao,
  permissaoNotificacao,
  notificarNovaSolicitacao,
  tocarAlerta,
} from "@/lib/notificacoes";
import { contarStatus, statusOpcoes, STATUS_META } from "@/lib/status";
import { senhaForte, SENHA_REGRA_TEXTO } from "@/lib/senha";
import { ROTA_COLUMNS, type RotaRow } from "@/lib/rotasMap";
import type { FotoGaleriaRow, VeiculoFrotaRow } from "@/lib/dados-tipos";
import { transicoesPermitidas, type PedidoStatus } from "@/lib/pedidos-transicoes";
import { PEDIDO_STATUS_META, PEDIDO_STATUS_OPTIONS, formatarDataHora } from "@/lib/pedidos-status";
import {
  definirPapelAdmin,
  listUsuarios,
  redefinirSenhaUsuario,
  type UsuarioAdmin,
} from "@/lib/usuarios.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel do administrador — Dias Transporte" },
      { name: "description", content: "Gestão de rotas, preços, fotos e agendamentos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel do administrador — Dias Transporte" },
      { property: "og:description", content: "Gestão interna Dias Transporte." },
    ],
  }),
  component: AdminPage,
});

/** "Hoje" / "Amanhã" / dd/mm — pra triagem rápida de viagens próximas. */
function rotuloData(dataViagem: string): string {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const data = new Date(`${dataViagem}T00:00:00`);
  const diffDias = Math.round((data.getTime() - hoje.getTime()) / 86_400_000);
  if (diffDias === 0) return "Hoje";
  if (diffDias === 1) return "Amanhã";
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Viagem com data passada que ninguém marcou como concluída/cancelada. */
function estaAtrasada(a: { status: string; data_viagem: string | null }): boolean {
  if (a.status !== "pendente" && a.status !== "confirmado") return false;
  if (!a.data_viagem) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return new Date(`${a.data_viagem}T00:00:00`) < hoje;
}

function slugify(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

function linkWhatsappCliente(telefone: string | null) {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  if (!digitos) return null;
  const comDdi = digitos.length <= 11 ? `55${digitos}` : digitos;
  return `https://wa.me/${comDdi}`;
}

const abas = [
  { id: "geral", label: "Visão geral", icon: LayoutDashboard },
  { id: "rotas", label: "Rotas e preços", icon: RouteIcon },
  // Edição de frota só existe no ramo VPS por enquanto — ver o comentário
  // em dados.ts::listarFrotaVeiculosAdmin sobre por que o ramo Supabase
  // ainda não existe. Escondida (não removida) fora de MODO_VPS: a aba
  // nem aparece, em vez de aparecer e dar erro ao tentar carregar.
  { id: "frota", label: "Frota", icon: Truck, soVps: true },
  { id: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
  // Despacho (portado do car-fleet-co, Etapa 6/7 do roteiro da fusão) —
  // mesmo motivo de "frota" acima: VPS-only, aba escondida fora de MODO_VPS.
  { id: "corridas", label: "Corridas", icon: Car, soVps: true },
  { id: "fornecedores", label: "Motoristas", icon: UserCog, soVps: true },
  { id: "empresas", label: "Empresas", icon: Building2, soVps: true },
  { id: "canais", label: "Canais", icon: Radio, soVps: true },
  { id: "categorias", label: "Categorias", icon: Tag, soVps: true },
  { id: "conteudo", label: "Conteúdo do site", icon: FileText },
  { id: "usuarios", label: "Usuários e acessos", icon: Users },
] as const;

function AdminPage() {
  const { user, isAdmin, carregando } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<(typeof abas)[number]["id"]>("geral");
  const [permissaoNotif, setPermissaoNotif] = useState<NotificationPermission | null>(null);
  const idsPendentesVistos = useRef<Set<string> | null>(null);
  const abasVisiveis = abas.filter((a) => !("soVps" in a && a.soVps) || MODO_VPS);

  useEffect(() => {
    if (!carregando && !isAdmin) {
      toast.error("Área restrita ao administrador.");
      void navigate({ to: "/minhas-viagens", replace: true });
    }
  }, [carregando, isAdmin, navigate]);

  useEffect(() => {
    setPermissaoNotif(permissaoNotificacao());
  }, []);

  // Fica sempre "ligado" (não depende de qual aba está montada) pra avisar de
  // solicitações novas mesmo se o admin estiver em outra aba do painel — e
  // mantém o cache de ["admin-agendamentos"] quente pras outras abas.
  const { data: agendamentosLive } = useQuery({
    queryKey: ["admin-agendamentos"],
    queryFn: () => listarAgendamentos(),
    enabled: isAdmin,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!agendamentosLive) return;
    const pendentesAgora = agendamentosLive.filter((a) => a.status === "pendente");
    const idsAgora = new Set(pendentesAgora.map((a) => a.id));
    const vistosAntes = idsPendentesVistos.current;
    if (vistosAntes) {
      const novos = pendentesAgora.filter((a) => !vistosAntes.has(a.id));
      if (novos.length) {
        tocarAlerta();
        for (const a of novos) {
          const detalhe = `${a.contato_nome ?? "Sem nome"} · ${a.data_viagem ?? "data a combinar"}`;
          toast.message(`Nova solicitação: ${a.trecho}`, { description: detalhe });
          notificarNovaSolicitacao(`Nova solicitação: ${a.trecho}`, detalhe);
        }
      }
    }
    idsPendentesVistos.current = idsAgora;
  }, [agendamentosLive]);

  const pendentesCount = (agendamentosLive ?? []).filter((a) => a.status === "pendente").length;

  if (carregando || !isAdmin) {
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

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="font-display text-3xl">Painel do administrador</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user?.email ? `Logado como ${user.email} · ` : ""}
          Acompanhe agendamentos, edite rotas, preços, fotos e o conteúdo do site.
        </p>
        {permissaoNotif === "default" && (
          <button
            type="button"
            onClick={() => void pedirPermissaoNotificacao().then(setPermissaoNotif)}
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
          >
            <BellRing className="size-4" /> Ativar aviso no navegador para novas solicitações
          </button>
        )}
        {permissaoNotif === "denied" && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <BellRing className="size-3.5" /> Notificações do navegador bloqueadas — o aviso sonoro
            no painel continua funcionando.
          </p>
        )}

        <Tabs
          value={aba}
          onValueChange={(v) => setAba(v as (typeof abas)[number]["id"])}
          className="mt-6"
        >
          {/* Abas roláveis na horizontal em telas estreitas (celular/tablet retrato) */}
          <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex h-auto w-max justify-start gap-1 bg-secondary/60 p-1">
              {abasVisiveis.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="min-h-11 shrink-0 gap-1.5 whitespace-nowrap px-3 text-sm"
                >
                  <Icon className="size-4 shrink-0" /> {label}
                  {id === "agendamentos" && pendentesCount > 0 && (
                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      {pendentesCount}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="geral" className="mt-6">
            <AdminVisaoGeral onIrPara={setAba} />
          </TabsContent>
          <TabsContent value="rotas" className="mt-6">
            <AdminRotas />
          </TabsContent>
          {MODO_VPS && (
            <TabsContent value="frota" className="mt-6">
              <AdminFrota />
            </TabsContent>
          )}
          <TabsContent value="agendamentos" className="mt-6">
            <AdminAgendamentos />
          </TabsContent>
          {MODO_VPS && (
            <TabsContent value="corridas" className="mt-6">
              <AdminCorridas />
            </TabsContent>
          )}
          {MODO_VPS && (
            <TabsContent value="fornecedores" className="mt-6">
              <AdminFornecedores />
            </TabsContent>
          )}
          {MODO_VPS && (
            <TabsContent value="empresas" className="mt-6">
              <AdminEmpresas />
            </TabsContent>
          )}
          {MODO_VPS && (
            <TabsContent value="canais" className="mt-6">
              <AdminCanais />
            </TabsContent>
          )}
          {MODO_VPS && (
            <TabsContent value="categorias" className="mt-6">
              <AdminCategorias />
            </TabsContent>
          )}
          <TabsContent value="conteudo" className="mt-6">
            <AdminConteudo />
          </TabsContent>
          <TabsContent value="usuarios" className="mt-6">
            <AdminUsuarios />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-2 font-display text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function AdminVisaoGeral({ onIrPara }: { onIrPara: (aba: (typeof abas)[number]["id"]) => void }) {
  const { data: agendamentos, isLoading: carregandoAgendamentos } = useQuery({
    queryKey: ["admin-agendamentos"],
    queryFn: () => listarAgendamentos(),
  });

  const { data: rotas, isLoading: carregandoRotas } = useQuery({
    queryKey: ["admin-rotas"],
    queryFn: () => listarRotasAdmin(),
  });

  if (carregandoAgendamentos || carregandoRotas) {
    return <p className="text-sm text-muted-foreground">Carregando painel…</p>;
  }

  const lista = agendamentos ?? [];
  const rotasLista = rotas ?? [];
  const contagem = contarStatus(lista);
  const receitaConfirmada = lista
    .filter((a) => a.status === "confirmado" || a.status === "concluido")
    .reduce((soma, a) => soma + (a.valor ?? 0), 0);
  const rotasAtivas = rotasLista.filter((r) => r.ativo).length;
  const recentes = lista.slice(0, 5);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em7dias = new Date(hoje);
  em7dias.setDate(hoje.getDate() + 7);
  const proximas = lista
    .filter((a) => a.status !== "cancelado" && a.data_viagem)
    .filter((a) => {
      const d = new Date(`${a.data_viagem}T00:00:00`);
      return d >= hoje && d <= em7dias;
    })
    .sort((a, b) => (a.data_viagem ?? "").localeCompare(b.data_viagem ?? ""))
    .slice(0, 6);

  // Viagem já deveria ter acontecido e ninguém marcou como concluída ou
  // cancelada — sem isso, uma reserva velha fica pendente pra sempre e some
  // do radar de quem opera.
  const atrasadas = lista.filter(estaAtrasada);

  return (
    <div className="space-y-8">
      {atrasadas.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-200">
            <strong>
              {atrasadas.length} reserva{atrasadas.length > 1 ? "s" : ""}
            </strong>{" "}
            com data de viagem já passada ainda {atrasadas.length > 1 ? "estão" : "está"} como
            pendente/confirmada. Atualize o status para concluída ou cancelada.
          </p>
          <Button className="h-11 shrink-0" onClick={() => onIrPara("agendamentos")}>
            Revisar agora
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Agendamentos"
          value={String(lista.length)}
          hint={`${contagem["pendente"] ?? 0} pendente(s)`}
          icon={CalendarCheck}
        />
        <StatCard
          label="Receita confirmada"
          value={formatBRL(receitaConfirmada)}
          hint="Confirmados + concluídos"
          icon={Wallet}
        />
        <StatCard
          label="Rotas ativas"
          value={`${rotasAtivas} / ${rotasLista.length}`}
          hint="Visíveis no site"
          icon={RouteIcon}
        />
        <StatCard
          label="Cancelamentos"
          value={String(contagem["cancelado"] ?? 0)}
          hint="Do total de agendamentos"
          icon={LayoutDashboard}
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg">Status dos agendamentos</h2>
          <Button
            variant="secondary"
            className="h-11 shrink-0"
            onClick={() => onIrPara("agendamentos")}
          >
            Ver todos
          </Button>
        </div>
        {lista.length ? (
          <>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
              {statusOpcoes.map((s) =>
                contagem[s] ? (
                  <div
                    key={s}
                    className={STATUS_META[s].barClass}
                    style={{ width: `${((contagem[s] ?? 0) / lista.length) * 100}%` }}
                    title={`${STATUS_META[s].label}: ${contagem[s]}`}
                  />
                ) : null,
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              {statusOpcoes.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", STATUS_META[s].barClass)} />
                  {STATUS_META[s].label}: {contagem[s] ?? 0}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum agendamento ainda.</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg">Próximas viagens (7 dias)</h2>
          <Button
            variant="secondary"
            className="h-11 shrink-0"
            onClick={() => onIrPara("agendamentos")}
          >
            Ver todos
          </Button>
        </div>
        {proximas.length ? (
          <div className="mt-4 divide-y divide-border">
            {proximas.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">{a.trecho}</p>
                  <p className="text-xs text-muted-foreground">
                    {rotuloData(a.data_viagem as string)}
                    {a.hora ? ` · ${a.hora}` : ""} · {a.contato_nome ?? "sem nome"}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma viagem prevista para os próximos 7 dias.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg">Últimos agendamentos</h2>
          <Button
            variant="secondary"
            className="h-11 shrink-0"
            onClick={() => onIrPara("agendamentos")}
          >
            Ver todos
          </Button>
        </div>
        {recentes.length ? (
          <div className="mt-4 divide-y divide-border">
            {recentes.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium">{a.trecho}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.contato_nome ?? "sem nome"} ·{" "}
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum agendamento ainda.</p>
        )}
      </div>
    </div>
  );
}

const ROTA_VAZIA = {
  origem: "",
  destino: "",
  slug: "",
  duracao: "",
  distancia: "",
  preco_pequeno: "",
  resumo: "",
};

function NovaRotaDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(ROTA_VAZIA);
  const [slugManual, setSlugManual] = useState(false);

  const slugAtual = slugManual ? form.slug : slugify(`${form.origem}-${form.destino}`);

  const criar = useMutation({
    mutationFn: async () => {
      if (!form.origem.trim() || !form.destino.trim()) {
        throw new Error("Preencha origem e destino.");
      }
      await criarRota({
        slug: slugAtual || `rota-${Date.now()}`,
        origem: form.origem,
        destino: form.destino,
        duracao: form.duracao,
        distancia: form.distancia,
        preco_pequeno: Number(form.preco_pequeno) || 0,
        resumo: form.resumo,
      });
    },
    onSuccess: () => {
      toast.success("Rota criada como oculta. Edite os detalhes e ative quando estiver pronta.");
      void queryClient.invalidateQueries({ queryKey: ["admin-rotas"] });
      setOpen(false);
      setForm(ROTA_VAZIA);
      setSlugManual(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar rota."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-11">
          <Plus className="size-4" /> Nova rota
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova rota</DialogTitle>
          <DialogDescription>
            Crie o registro básico da rota. Ela entra oculta no site — edite fotos e descrição
            depois e marque como visível quando estiver pronta.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo
            label="Origem"
            value={form.origem}
            onChange={(v) => setForm((f) => ({ ...f, origem: v }))}
          />
          <Campo
            label="Destino"
            value={form.destino}
            onChange={(v) => setForm((f) => ({ ...f, destino: v }))}
          />
          <Campo
            label="Duração"
            value={form.duracao}
            onChange={(v) => setForm((f) => ({ ...f, duracao: v }))}
          />
          <Campo
            label="Distância"
            value={form.distancia}
            onChange={(v) => setForm((f) => ({ ...f, distancia: v }))}
          />
          <CampoNumero
            label="Preço carro pequeno (dia)"
            value={form.preco_pequeno === "" ? null : Number(form.preco_pequeno)}
            onChange={(v) => setForm((f) => ({ ...f, preco_pequeno: v === null ? "" : String(v) }))}
          />
          <div>
            <Label>Slug (URL)</Label>
            <Input
              className="mt-2"
              value={slugAtual}
              onChange={(e) => {
                setSlugManual(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
            />
          </div>
        </div>
        <div>
          <Label>Resumo</Label>
          <Textarea
            className="mt-2"
            rows={2}
            value={form.resumo}
            onChange={(e) => setForm((f) => ({ ...f, resumo: e.target.value }))}
          />
        </div>

        <DialogFooter>
          <Button
            className="h-11 w-full sm:w-auto"
            onClick={() => criar.mutate()}
            disabled={criar.isPending}
          >
            {criar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Criar rota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminRotas() {
  const [busca, setBusca] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-rotas"],
    queryFn: () => listarRotasAdmin(),
  });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return data ?? [];
    return (data ?? []).filter((r) =>
      `${r.origem} ${r.destino} ${r.slug}`.toLowerCase().includes(termo),
    );
  }, [data, busca]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando rotas…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por origem ou destino"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {filtradas.length} de {data?.length ?? 0} rotas
          </p>
          <NovaRotaDialog />
        </div>
      </div>

      {filtradas.length ? (
        filtradas.map((rota) => <RotaEditor key={rota.id} rota={rota} />)
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma rota encontrada.</p>
      )}
    </div>
  );
}

function RotaEditor({ rota }: { rota: RotaRow }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(rota);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const salvar = useMutation({
    mutationFn: async () => {
      await salvarRota({ ...form, id: rota.id });
    },
    onSuccess: () => {
      toast.success("Rota atualizada.");
      void queryClient.invalidateQueries({ queryKey: ["admin-rotas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const remover = useMutation({
    mutationFn: async () => {
      await removerRota(rota.id);
    },
    onSuccess: () => {
      toast.success("Rota removida.");
      void queryClient.invalidateQueries({ queryKey: ["admin-rotas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover rota."),
  });

  async function enviarFoto(arquivo: File, destino: "principal" | "galeria") {
    setEnviandoFoto(true);
    try {
      const url = await uploadImagem(arquivo, rota.slug);
      setForm((f) =>
        destino === "principal"
          ? { ...f, foto: url, galeria: [url, ...f.galeria] }
          : { ...f, galeria: [...f.galeria, url] },
      );
      toast.success("Foto enviada. Clique em salvar para publicar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={form.foto}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            className="size-12 shrink-0 rounded-sm object-cover"
          />
          <div>
            <h2 className="font-display text-lg">
              {rota.origem} → {rota.destino}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {formatBRL(rota.preco_pequeno)}
              <Badge
                variant="outline"
                className={
                  rota.ativo
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-muted text-muted-foreground"
                }
              >
                {rota.ativo ? "ativa" : "oculta"}
              </Badge>
              {rota.destaque ? <Badge variant="outline">{rota.destaque}</Badge> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-11 flex-1 md:flex-none"
            onClick={() => setAberto((v) => !v)}
          >
            {aberto ? "Fechar" : "Editar"}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="size-11 shrink-0 text-destructive"
            title="Remover rota"
            disabled={remover.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Remover a rota ${rota.origem} → ${rota.destino}? Essa ação não pode ser desfeita.`,
                )
              ) {
                remover.mutate();
              }
            }}
          >
            {remover.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {aberto && (
        <div className="mt-6 space-y-4 border-t border-border pt-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo
              label="Origem"
              value={form.origem}
              onChange={(v) => setForm({ ...form, origem: v })}
            />
            <Campo
              label="Destino"
              value={form.destino}
              onChange={(v) => setForm({ ...form, destino: v })}
            />
            <Campo
              label="Duração"
              value={form.duracao}
              onChange={(v) => setForm({ ...form, duracao: v })}
            />
            <Campo
              label="Distância"
              value={form.distancia}
              onChange={(v) => setForm({ ...form, distancia: v })}
            />
            <CampoNumero
              label="Preço carro pequeno (dia)"
              value={form.preco_pequeno}
              onChange={(v) => setForm({ ...form, preco_pequeno: v ?? 0 })}
            />
            <CampoNumero
              label="Preço carro grande (dia)"
              value={form.preco_grande}
              onChange={(v) => setForm({ ...form, preco_grande: v })}
            />
            <CampoNumero
              label="Preço pequeno (noite)"
              value={form.preco_pequeno_noite}
              onChange={(v) => setForm({ ...form, preco_pequeno_noite: v })}
            />
            <CampoNumero
              label="Preço grande (noite)"
              value={form.preco_grande_noite}
              onChange={(v) => setForm({ ...form, preco_grande_noite: v })}
            />
            <Campo
              label="Selo de destaque"
              value={form.destaque ?? ""}
              onChange={(v) => setForm({ ...form, destaque: v })}
            />
          </div>

          <div>
            <Label>Resumo</Label>
            <Textarea
              className="mt-2"
              rows={2}
              value={form.resumo}
              onChange={(e) => setForm({ ...form, resumo: e.target.value })}
            />
          </div>
          <div>
            <Label>Descrição completa</Label>
            <Textarea
              className="mt-2"
              rows={5}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>

          <div>
            <Label>Foto principal</Label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="file"
                accept="image/*"
                className="h-11 sm:max-w-xs"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) void enviarFoto(arquivo, "principal");
                }}
              />
              <Input
                className="h-11"
                value={form.foto}
                onChange={(e) => setForm({ ...form, foto: e.target.value })}
                placeholder="ou cole a URL da imagem"
              />
            </div>
          </div>

          <div>
            <Label>Galeria ({form.galeria.length} fotos)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {form.galeria.map((url, i) => (
                <div key={`${url}-${i}`} className="relative">
                  <img
                    src={url}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="size-16 rounded-sm object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remover foto"
                    onClick={() =>
                      setForm((f) => ({ ...f, galeria: f.galeria.filter((_, idx) => idx !== i) }))
                    }
                    className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-destructive text-sm leading-none text-destructive-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <Input
              type="file"
              accept="image/*"
              className="mt-3 h-11 sm:max-w-xs"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) void enviarFoto(arquivo, "galeria");
              }}
            />
          </div>

          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Rota visível no site
          </label>

          <Button
            className="h-11 w-full sm:w-auto"
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending || enviandoFoto}
          >
            {salvar.isPending || enviandoFoto ? (
              <Loader2 className="size-4 animate-spin" />
            ) : enviandoFoto ? (
              <Upload className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar alterações
          </Button>
        </div>
      )}
    </article>
  );
}

function Campo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-2 h-11" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-2 h-11"
        type="number"
        min={0}
        value={value ?? ""}
        placeholder="sob consulta"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}

// ------------------------------------------------------------------- frota
function AdminFrota() {
  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-fluid-lg">Veículos</h2>
          <NovoVeiculoDialog />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Mostrados na home e em "Nossa frota". Enquanto não houver nenhum aqui, o site mostra os
          dois carros padrão.
        </p>
        <AdminVeiculosLista />
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-fluid-lg">Galeria "Na estrada"</h2>
          <NovaFotoGaleriaDialog />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Fotos da seção "Na estrada" em "Nossa frota". Enquanto não houver nenhuma aqui, o site
          mostra as fotos padrão.
        </p>
        <AdminGaleriaLista />
      </section>
    </div>
  );
}

const VEICULO_VAZIO = {
  nome: "",
  modelo: "",
  passageiros: "",
  bagagem: "",
  foto: "",
  itens: [] as string[],
  ordem: 0,
};

function NovoVeiculoDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(VEICULO_VAZIO);

  const criar = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Preencha o nome do veículo.");
      await criarVeiculoFrota(form);
    },
    onSuccess: () => {
      toast.success("Veículo criado. Edite os detalhes e adicione uma foto.");
      void queryClient.invalidateQueries({ queryKey: ["admin-frota-veiculos"] });
      setOpen(false);
      setForm(VEICULO_VAZIO);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar veículo."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-11">
          <Plus className="size-4" /> Novo veículo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo veículo</DialogTitle>
          <DialogDescription>Crie o registro básico — edite foto e itens depois.</DialogDescription>
        </DialogHeader>
        <Campo
          label="Nome"
          value={form.nome}
          onChange={(v) => setForm((f) => ({ ...f, nome: v }))}
        />
        <Campo
          label="Modelo"
          value={form.modelo}
          onChange={(v) => setForm((f) => ({ ...f, modelo: v }))}
        />
        <DialogFooter>
          <Button className="h-11 w-full" onClick={() => criar.mutate()} disabled={criar.isPending}>
            {criar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Criar veículo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminVeiculosLista() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-frota-veiculos"],
    queryFn: () => listarFrotaVeiculosAdmin(),
  });

  if (isLoading) return <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>;
  if (!data?.length) {
    return <p className="mt-4 text-sm text-muted-foreground">Nenhum veículo cadastrado ainda.</p>;
  }
  return (
    <div className="mt-4 space-y-4">
      {data.map((v) => (
        <VeiculoEditor key={v.id} veiculo={v} />
      ))}
    </div>
  );
}

function VeiculoEditor({ veiculo }: { veiculo: VeiculoFrotaRow }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(veiculo);
  const [novoItem, setNovoItem] = useState("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const salvar = useMutation({
    mutationFn: async () => salvarVeiculoFrota(form),
    onSuccess: () => {
      toast.success("Veículo atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-frota-veiculos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const remover = useMutation({
    mutationFn: async () => removerVeiculoFrota(veiculo.id),
    onSuccess: () => {
      toast.success("Veículo removido.");
      void queryClient.invalidateQueries({ queryKey: ["admin-frota-veiculos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover."),
  });

  async function enviarFoto(arquivo: File) {
    setEnviandoFoto(true);
    try {
      const url = await uploadImagem(arquivo, `frota-${slugify(form.nome)}`);
      setForm((f) => ({ ...f, foto: url }));
      toast.success("Foto enviada. Clique em salvar para publicar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {form.foto ? (
            <img
              src={form.foto}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
              className="size-12 shrink-0 rounded-sm object-cover"
            />
          ) : (
            <div className="grid size-12 shrink-0 place-items-center rounded-sm bg-muted">
              <Truck className="size-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <h3 className="font-display text-lg">{veiculo.nome}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {veiculo.modelo || "sem modelo"}
              <Badge
                variant="outline"
                className={
                  veiculo.ativo
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-muted text-muted-foreground"
                }
              >
                {veiculo.ativo ? "visível" : "oculto"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="h-11 flex-1 md:flex-none"
            onClick={() => setAberto((v) => !v)}
          >
            {aberto ? "Fechar" : "Editar"}
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="size-11 shrink-0 text-destructive"
            title="Remover veículo"
            disabled={remover.isPending}
            onClick={() => {
              if (window.confirm(`Remover "${veiculo.nome}"? Essa ação não pode ser desfeita.`)) {
                remover.mutate();
              }
            }}
          >
            {remover.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {aberto && (
        <div className="mt-6 space-y-4 border-t border-border pt-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
            <Campo
              label="Modelo"
              value={form.modelo}
              onChange={(v) => setForm({ ...form, modelo: v })}
            />
            <Campo
              label="Passageiros (texto livre)"
              value={form.passageiros}
              onChange={(v) => setForm({ ...form, passageiros: v })}
            />
            <Campo
              label="Bagagem (texto livre)"
              value={form.bagagem}
              onChange={(v) => setForm({ ...form, bagagem: v })}
            />
            <CampoNumero
              label="Ordem de exibição"
              value={form.ordem}
              onChange={(v) => setForm({ ...form, ordem: v ?? 0 })}
            />
          </div>

          <div>
            <Label>Foto</Label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="file"
                accept="image/*"
                className="h-11 sm:max-w-xs"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) void enviarFoto(arquivo);
                }}
              />
              <Input
                className="h-11"
                value={form.foto}
                onChange={(e) => setForm({ ...form, foto: e.target.value })}
                placeholder="ou cole a URL da imagem"
              />
            </div>
          </div>

          <div>
            <Label>Itens ({form.itens.length})</Label>
            <ul className="mt-2 space-y-1.5">
              {form.itens.map((item, i) => (
                <li key={`${item}-${i}`} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">— {item}</span>
                  <button
                    type="button"
                    aria-label="Remover item"
                    onClick={() =>
                      setForm((f) => ({ ...f, itens: f.itens.filter((_, idx) => idx !== i) }))
                    }
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-destructive text-sm leading-none text-destructive-foreground"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input
                className="h-11"
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                placeholder="Ex.: Ar-condicionado"
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || !novoItem.trim()) return;
                  e.preventDefault();
                  setForm((f) => ({ ...f, itens: [...f.itens, novoItem.trim()] }));
                  setNovoItem("");
                }}
              />
              <Button
                type="button"
                variant="secondary"
                className="h-11 shrink-0"
                disabled={!novoItem.trim()}
                onClick={() => {
                  setForm((f) => ({ ...f, itens: [...f.itens, novoItem.trim()] }));
                  setNovoItem("");
                }}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-5"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Visível no site
          </label>

          <Button
            className="h-11 w-full sm:w-auto"
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending || enviandoFoto}
          >
            {salvar.isPending || enviandoFoto ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar alterações
          </Button>
        </div>
      )}
    </article>
  );
}

function NovaFotoGaleriaDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [foto, setFoto] = useState("");
  const [alt, setAlt] = useState("");
  const [enviando, setEnviando] = useState(false);

  const criar = useMutation({
    mutationFn: async () => {
      if (!foto.trim()) throw new Error("Envie ou cole a URL de uma foto.");
      await criarFotoGaleria({ foto, alt, ordem: 0 });
    },
    onSuccess: () => {
      toast.success("Foto adicionada à galeria.");
      void queryClient.invalidateQueries({ queryKey: ["admin-frota-galeria"] });
      setOpen(false);
      setFoto("");
      setAlt("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao adicionar foto."),
  });

  async function enviarFoto(arquivo: File) {
    setEnviando(true);
    try {
      const url = await uploadImagem(arquivo, "frota-galeria");
      setFoto(url);
      toast.success("Foto enviada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar foto.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-11">
          <Plus className="size-4" /> Nova foto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova foto da galeria</DialogTitle>
          <DialogDescription>
            Aparece na seção "Na estrada" de "Nossa frota". Descreva a foto pra quem usa leitor de
            tela.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>Foto</Label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              type="file"
              accept="image/*"
              className="h-11 sm:max-w-xs"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) void enviarFoto(arquivo);
              }}
            />
            <Input
              className="h-11"
              value={foto}
              onChange={(e) => setFoto(e.target.value)}
              placeholder="ou cole a URL da imagem"
            />
          </div>
        </div>
        <Campo label="Descrição da foto (alt)" value={alt} onChange={setAlt} />
        <DialogFooter>
          <Button
            className="h-11 w-full"
            onClick={() => criar.mutate()}
            disabled={criar.isPending || enviando}
          >
            {criar.isPending || enviando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Adicionar foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminGaleriaLista() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-frota-galeria"],
    queryFn: () => listarFrotaGaleriaAdmin(),
  });

  if (isLoading) return <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>;
  if (!data?.length) {
    return <p className="mt-4 text-sm text-muted-foreground">Nenhuma foto na galeria ainda.</p>;
  }
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {data.map((f) => (
        <FotoGaleriaCard key={f.id} foto={f} />
      ))}
    </div>
  );
}

function FotoGaleriaCard({ foto }: { foto: FotoGaleriaRow }) {
  const queryClient = useQueryClient();

  const alternarAtivo = useMutation({
    mutationFn: async () => salvarFotoGaleria({ ...foto, ativo: !foto.ativo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-frota-galeria"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar."),
  });

  const remover = useMutation({
    mutationFn: async () => removerFotoGaleria(foto.id),
    onSuccess: () => {
      toast.success("Foto removida.");
      void queryClient.invalidateQueries({ queryKey: ["admin-frota-galeria"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover."),
  });

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted">
      <img
        src={foto.foto}
        alt={foto.alt}
        width={200}
        height={200}
        loading="lazy"
        decoding="async"
        className="aspect-square w-full object-cover"
      />
      {!foto.ativo && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <Badge variant="outline">oculta</Badge>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/90 p-1.5">
        <button
          type="button"
          className="min-h-8 flex-1 rounded-sm px-2 text-xs hover:bg-secondary"
          disabled={alternarAtivo.isPending}
          onClick={() => alternarAtivo.mutate()}
        >
          {foto.ativo ? "Ocultar" : "Mostrar"}
        </button>
        <button
          type="button"
          aria-label="Remover foto"
          disabled={remover.isPending}
          onClick={() => {
            if (window.confirm("Remover esta foto da galeria?")) remover.mutate();
          }}
          className="grid size-8 shrink-0 place-items-center rounded-sm text-destructive hover:bg-secondary"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- corridas
// Despacho (portado do car-fleet-co, Etapa 6/7 do roteiro da fusão) — falta
// só o voucher em PDF (o resto: criar, importar em lote, transicionar
// status e atribuir motorista já estão aqui).
function AdminCorridas() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<PedidoStatus | "todos">("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-corridas"],
    queryFn: () => listarPedidosAdmin(),
  });
  const { data: fornecedores } = useQuery({
    queryKey: ["admin-fornecedores"],
    queryFn: () => listarFornecedores(),
  });
  const fornecedoresAtivos = useMemo(
    () => (fornecedores ?? []).filter((f) => f.ativo),
    [fornecedores],
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
      if (!termo) return true;
      return `${p.passageiro_nome} ${p.cidade_atendimento}`.toLowerCase().includes(termo);
    });
  }, [data, busca, filtroStatus]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando corridas…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 pl-8"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por passageiro ou cidade"
            />
          </div>
          <Select
            value={filtroStatus}
            onValueChange={(v) => setFiltroStatus(v as PedidoStatus | "todos")}
          >
            <SelectTrigger className="h-11 sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {PEDIDO_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {PEDIDO_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {filtradas.length} de {data?.length ?? 0} corridas
          </p>
          <div className="flex gap-2">
            <ImportarPedidosDialog />
            <NovaCorridaDialog />
          </div>
        </div>
      </div>

      {!data?.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma corrida cadastrada ainda.</p>
      ) : !filtradas.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma corrida encontrada.</p>
      ) : (
        <div className="space-y-3">
          {filtradas.map((p) => (
            <CorridaCard key={p.id} pedido={p} fornecedoresAtivos={fornecedoresAtivos} />
          ))}
        </div>
      )}
    </div>
  );
}

type CorridaRow = Awaited<ReturnType<typeof listarPedidosAdmin>>[number];

function CorridaCard({
  pedido: p,
  fornecedoresAtivos,
}: {
  pedido: CorridaRow;
  fornecedoresAtivos: Fornecedor[];
}) {
  const queryClient = useQueryClient();
  const statusAtual = p.status as PedidoStatus;
  const opcoesStatus = useMemo(
    () => [statusAtual, ...transicoesPermitidas(statusAtual, "admin")],
    [statusAtual],
  );

  const mudarStatus = useMutation({
    mutationFn: (novoStatus: PedidoStatus) => transicionarStatusPedido(p.id, novoStatus),
    onSuccess: () => {
      toast.success("Status atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-corridas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao mudar status."),
  });

  const mudarMotorista = useMutation({
    mutationFn: (fornecedorId: string | null) => atribuirMotoristaPedido(p.id, fornecedorId),
    onSuccess: () => {
      toast.success("Motorista atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-corridas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atribuir motorista."),
  });

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg break-words">{p.passageiro_nome}</h2>
            <Badge variant="outline">{p.direcao === "IN" ? "Chegada" : "Saída"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.cidade_atendimento} · {formatarDataHora(p.data_hora_encontro)}
            {p.hotel ? ` · ${p.hotel}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {p.canal_nome ?? "sem canal"}
            {p.empresa_nome ? ` · ${p.empresa_nome}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusAtual}
            onValueChange={(v) => mudarStatus.mutate(v as PedidoStatus)}
            disabled={mudarStatus.isPending}
          >
            <SelectTrigger
              className={cn("h-9 w-[220px]", PEDIDO_STATUS_META[statusAtual].badgeClass)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcoesStatus.map((s) => (
                <SelectItem key={s} value={s}>
                  {PEDIDO_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <UserCog className="size-4 shrink-0 text-muted-foreground" />
        <Select
          value={p.fornecedor_id ?? "none"}
          onValueChange={(v) => mudarMotorista.mutate(v === "none" ? null : v)}
          disabled={mudarMotorista.isPending}
        >
          <SelectTrigger className="h-9 w-full sm:w-[260px]">
            <SelectValue placeholder="Sem motorista atribuído" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem motorista atribuído</SelectItem>
            {fornecedoresAtivos.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </article>
  );
}

const CORRIDA_VAZIA = {
  passageiro_nome: "",
  passageiro_telefone: "",
  cidade_atendimento: "",
  hotel: "",
  data_hora_encontro: "",
  direcao: "IN" as "IN" | "OUT",
  ponto_partida: "",
  ponto_chegada: "",
  numero_voo: "",
  categoria_veiculo_id: "" as string,
  canal_venda_id: "" as string,
  observacoes_internas: "",
};

function NovaCorridaDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(CORRIDA_VAZIA);

  const { data: categorias } = useQuery({
    queryKey: ["admin-categorias-veiculo"],
    queryFn: () => listarCategoriasVeiculo(),
    enabled: open,
  });
  const { data: canais } = useQuery({
    queryKey: ["admin-canais-venda"],
    queryFn: () => listarCanaisVenda(),
    enabled: open,
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (
        !form.passageiro_nome.trim() ||
        !form.cidade_atendimento.trim() ||
        !form.data_hora_encontro
      ) {
        throw new Error("Preencha passageiro, cidade e data/hora.");
      }
      await criarPedido({
        codigo_reserva_canal: null,
        empresa_cliente_id: null,
        canal_venda_id: form.canal_venda_id || null,
        cidade_atendimento: form.cidade_atendimento,
        hotel: form.hotel || null,
        data_hora_encontro: new Date(form.data_hora_encontro).toISOString(),
        direcao: form.direcao,
        passageiro_nome: form.passageiro_nome,
        passageiro_telefone: form.passageiro_telefone || null,
        ponto_partida: form.ponto_partida || null,
        ponto_chegada: form.ponto_chegada || null,
        numero_voo: form.numero_voo || null,
        categoria_veiculo_id: form.categoria_veiculo_id || null,
        observacoes_internas: form.observacoes_internas,
      });
    },
    onSuccess: () => {
      toast.success("Corrida criada.");
      void queryClient.invalidateQueries({ queryKey: ["admin-corridas"] });
      setOpen(false);
      setForm(CORRIDA_VAZIA);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar corrida."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-11">
          <Plus className="size-4" /> Nova corrida
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova corrida</DialogTitle>
          <DialogDescription>
            Cadastre manualmente uma corrida que não veio pelo checkout do site (telefone, WhatsApp,
            outro canal).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Campo
            label="Passageiro"
            value={form.passageiro_nome}
            onChange={(v) => setForm((f) => ({ ...f, passageiro_nome: v }))}
          />
          <Campo
            label="WhatsApp"
            value={form.passageiro_telefone}
            onChange={(v) => setForm((f) => ({ ...f, passageiro_telefone: v }))}
          />
          <Campo
            label="Cidade de atendimento"
            value={form.cidade_atendimento}
            onChange={(v) => setForm((f) => ({ ...f, cidade_atendimento: v }))}
          />
          <div>
            <Label>Data e hora do encontro</Label>
            <Input
              className="mt-2 h-11"
              type="datetime-local"
              value={form.data_hora_encontro}
              onChange={(e) => setForm((f) => ({ ...f, data_hora_encontro: e.target.value }))}
            />
          </div>
          <div>
            <Label>Direção</Label>
            <Select
              value={form.direcao}
              onValueChange={(v) => setForm((f) => ({ ...f, direcao: v as "IN" | "OUT" }))}
            >
              <SelectTrigger className="mt-2 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">Chegada (IN)</SelectItem>
                <SelectItem value="OUT">Saída (OUT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria de veículo</Label>
            <div className="mt-2 flex gap-2">
              <Select
                value={form.categoria_veiculo_id}
                onValueChange={(v) => setForm((f) => ({ ...f, categoria_veiculo_id: v }))}
              >
                <SelectTrigger className="h-11 flex-1">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent>
                  {(categorias ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NovaCategoriaDialog />
            </div>
          </div>
          <div>
            <Label>Canal de venda</Label>
            <div className="mt-2 flex gap-2">
              <Select
                value={form.canal_venda_id}
                onValueChange={(v) => setForm((f) => ({ ...f, canal_venda_id: v }))}
              >
                <SelectTrigger className="h-11 flex-1">
                  <SelectValue placeholder="Sem canal" />
                </SelectTrigger>
                <SelectContent>
                  {(canais ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NovoCanalDialog />
            </div>
          </div>
          <Campo
            label="Hotel/pousada"
            value={form.hotel}
            onChange={(v) => setForm((f) => ({ ...f, hotel: v }))}
          />
          <Campo
            label="Número do voo"
            value={form.numero_voo}
            onChange={(v) => setForm((f) => ({ ...f, numero_voo: v }))}
          />
          <Campo
            label="Ponto de partida"
            value={form.ponto_partida}
            onChange={(v) => setForm((f) => ({ ...f, ponto_partida: v }))}
          />
          <Campo
            label="Ponto de chegada"
            value={form.ponto_chegada}
            onChange={(v) => setForm((f) => ({ ...f, ponto_chegada: v }))}
          />
        </div>

        <div>
          <Label>Observações internas</Label>
          <Textarea
            className="mt-2"
            rows={2}
            value={form.observacoes_internas}
            onChange={(e) => setForm((f) => ({ ...f, observacoes_internas: e.target.value }))}
          />
        </div>

        <DialogFooter>
          <Button className="h-11 w-full" onClick={() => criar.mutate()} disabled={criar.isPending}>
            {criar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Criar corrida
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovaCategoriaDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [capacidade, setCapacidade] = useState<number | null>(null);

  const criar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome da categoria.");
      await criarCategoriaVeiculo(nome, capacidade);
    },
    onSuccess: () => {
      toast.success("Categoria criada.");
      void queryClient.invalidateQueries({ queryKey: ["admin-categorias-veiculo"] });
      setOpen(false);
      setNome("");
      setCapacidade(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar categoria."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon" variant="secondary" className="size-11 shrink-0">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova categoria de veículo</DialogTitle>
        </DialogHeader>
        <Campo label="Nome" value={nome} onChange={setNome} />
        <CampoNumero
          label="Capacidade de passageiros"
          value={capacidade}
          onChange={setCapacidade}
        />
        <DialogFooter>
          <Button className="h-11 w-full" onClick={() => criar.mutate()} disabled={criar.isPending}>
            {criar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Criar categoria
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoCanalDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"ota" | "site_proprio" | "parceiro" | "outro">("outro");

  const criar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome do canal.");
      await criarCanalVenda(nome, tipo);
    },
    onSuccess: () => {
      toast.success("Canal criado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-canais-venda"] });
      setOpen(false);
      setNome("");
      setTipo("outro");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar canal."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="icon" variant="secondary" className="size-11 shrink-0">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo canal de venda</DialogTitle>
        </DialogHeader>
        <Campo label="Nome" value={nome} onChange={setNome} />
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
            <SelectTrigger className="mt-2 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="site_proprio">Site próprio</SelectItem>
              <SelectItem value="ota">OTA</SelectItem>
              <SelectItem value="parceiro">Parceiro</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button className="h-11 w-full" onClick={() => criar.mutate()} disabled={criar.isPending}>
            {criar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Criar canal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------- categorias
type CategoriaVeiculo = {
  id: string;
  nome: string;
  capacidade_passageiros: number | null;
  ativo: boolean;
};

function AtivoBadge({ ativo }: { ativo: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        ativo
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-border text-muted-foreground"
      }
    >
      {ativo ? "Ativo" : "Inativo"}
    </Badge>
  );
}

function AdminCategorias() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-categorias-veiculo"],
    queryFn: () => listarCategoriasVeiculo(),
  });

  const alternarAtivo = useMutation({
    mutationFn: (c: CategoriaVeiculo) => atualizarCategoriaVeiculo(c.id, { ativo: !c.ativo }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-categorias-veiculo"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar categoria."),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-fluid-lg">Categorias de veículo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sedan, SUV, van — usadas para casar cada corrida com o tipo de carro certo.
          </p>
        </div>
        <CategoriaDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div>
                <p className="font-medium">{c.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {c.capacidade_passageiros
                    ? `${String(c.capacidade_passageiros)} passageiros`
                    : "Capacidade não informada"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AtivoBadge ativo={c.ativo} />
                <CategoriaDialog categoria={c} />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={alternarAtivo.isPending}
                  onClick={() => alternarAtivo.mutate(c)}
                >
                  {c.ativo ? "Inativar" : "Ativar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriaDialog({ categoria }: { categoria?: CategoriaVeiculo }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [capacidade, setCapacidade] = useState<number | null>(
    categoria?.capacidade_passageiros ?? null,
  );

  const salvar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome da categoria.");
      if (categoria) {
        await atualizarCategoriaVeiculo(categoria.id, {
          nome: nome.trim(),
          capacidade_passageiros: capacidade,
        });
      } else {
        await criarCategoriaVeiculo(nome.trim(), capacidade);
      }
    },
    onSuccess: () => {
      toast.success(categoria ? "Categoria atualizada." : "Categoria criada.");
      void queryClient.invalidateQueries({ queryKey: ["admin-categorias-veiculo"] });
      setOpen(false);
      if (!categoria) {
        setNome("");
        setCapacidade(null);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar categoria."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {categoria ? (
          <Button type="button" size="icon" variant="ghost" className="size-9">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm" className="h-11">
            <Plus className="size-4" /> Nova categoria
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar categoria" : "Nova categoria de veículo"}</DialogTitle>
        </DialogHeader>
        <Campo label="Nome" value={nome} onChange={setNome} />
        <CampoNumero
          label="Capacidade de passageiros"
          value={capacidade}
          onChange={setCapacidade}
        />
        <DialogFooter>
          <Button
            className="h-11 w-full"
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending}
          >
            {salvar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : categoria ? (
              <Save className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {categoria ? "Salvar" : "Criar categoria"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------- empresas
type EmpresaCliente = {
  id: string;
  nome: string;
  documento: string | null;
  email_contato: string | null;
  telefone_contato: string | null;
  ativo: boolean;
};

function AdminEmpresas() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-empresas-clientes"],
    queryFn: () => listarEmpresasClientes(),
  });

  const alternarAtivo = useMutation({
    mutationFn: (e: EmpresaCliente) => atualizarEmpresaCliente(e.id, { ativo: !e.ativo }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-empresas-clientes"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar empresa."),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-fluid-lg">Empresas clientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Agências, OTAs e clientes B2B.</p>
        </div>
        <EmpresaDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <div className="space-y-3">
          {data.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="font-medium">{e.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {[e.documento, e.email_contato, e.telefone_contato].filter(Boolean).join(" · ") ||
                    "Sem dados de contato"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AtivoBadge ativo={e.ativo} />
                <EmpresaDialog empresa={e} />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={alternarAtivo.isPending}
                  onClick={() => alternarAtivo.mutate(e)}
                >
                  {e.ativo ? "Inativar" : "Ativar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPRESA_VAZIA = { nome: "", documento: "", email_contato: "", telefone_contato: "" };

function EmpresaDialog({ empresa }: { empresa?: EmpresaCliente }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    empresa
      ? {
          nome: empresa.nome,
          documento: empresa.documento ?? "",
          email_contato: empresa.email_contato ?? "",
          telefone_contato: empresa.telefone_contato ?? "",
        }
      : EMPRESA_VAZIA,
  );

  const salvar = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim()) throw new Error("Informe o nome da empresa.");
      const campos = {
        nome: form.nome.trim(),
        documento: form.documento.trim() || null,
        email_contato: form.email_contato.trim() || null,
        telefone_contato: form.telefone_contato.trim() || null,
      };
      if (empresa) await atualizarEmpresaCliente(empresa.id, campos);
      else await criarEmpresaCliente(campos);
    },
    onSuccess: () => {
      toast.success(empresa ? "Empresa atualizada." : "Empresa criada.");
      void queryClient.invalidateQueries({ queryKey: ["admin-empresas-clientes"] });
      setOpen(false);
      if (!empresa) setForm(EMPRESA_VAZIA);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar empresa."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {empresa ? (
          <Button type="button" size="icon" variant="ghost" className="size-9">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm" className="h-11">
            <Plus className="size-4" /> Nova empresa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{empresa ? "Editar empresa" : "Nova empresa cliente"}</DialogTitle>
        </DialogHeader>
        <Campo
          label="Nome"
          value={form.nome}
          onChange={(v) => setForm((f) => ({ ...f, nome: v }))}
        />
        <Campo
          label="Documento (CNPJ)"
          value={form.documento}
          onChange={(v) => setForm((f) => ({ ...f, documento: v }))}
        />
        <Campo
          label="E-mail de contato"
          value={form.email_contato}
          onChange={(v) => setForm((f) => ({ ...f, email_contato: v }))}
        />
        <Campo
          label="Telefone"
          value={form.telefone_contato}
          onChange={(v) => setForm((f) => ({ ...f, telefone_contato: v }))}
        />
        <DialogFooter>
          <Button
            className="h-11 w-full"
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending}
          >
            {salvar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : empresa ? (
              <Save className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {empresa ? "Salvar" : "Criar empresa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------- canais
type CanalVenda = { id: string; nome: string; tipo: string; ativo: boolean };

const CANAL_TIPO_LABEL: Record<string, string> = {
  ota: "OTA",
  site_proprio: "Site próprio",
  parceiro: "Parceiro",
  outro: "Outro",
};

function AdminCanais() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-canais-venda"],
    queryFn: () => listarCanaisVenda(),
  });

  const alternarAtivo = useMutation({
    mutationFn: (c: CanalVenda) => atualizarCanalVenda(c.id, { ativo: !c.ativo }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-canais-venda"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar canal."),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-fluid-lg">Canais de venda</h2>
          <p className="mt-1 text-sm text-muted-foreground">OTAs, agências e canais diretos.</p>
        </div>
        <CanalDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum canal cadastrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div>
                <p className="font-medium">{c.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {CANAL_TIPO_LABEL[c.tipo] ?? c.tipo}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AtivoBadge ativo={c.ativo} />
                <CanalDialog canal={c} />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={alternarAtivo.isPending}
                  onClick={() => alternarAtivo.mutate(c)}
                >
                  {c.ativo ? "Inativar" : "Ativar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CanalDialog({ canal }: { canal?: CanalVenda }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(canal?.nome ?? "");
  const [tipo, setTipo] = useState<"ota" | "site_proprio" | "parceiro" | "outro">(
    (canal?.tipo as "ota" | "site_proprio" | "parceiro" | "outro" | undefined) ?? "outro",
  );

  const salvar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome do canal.");
      if (canal) await atualizarCanalVenda(canal.id, { nome: nome.trim(), tipo });
      else await criarCanalVenda(nome.trim(), tipo);
    },
    onSuccess: () => {
      toast.success(canal ? "Canal atualizado." : "Canal criado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-canais-venda"] });
      setOpen(false);
      if (!canal) {
        setNome("");
        setTipo("outro");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar canal."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {canal ? (
          <Button type="button" size="icon" variant="ghost" className="size-9">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm" className="h-11">
            <Plus className="size-4" /> Novo canal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{canal ? "Editar canal" : "Novo canal de venda"}</DialogTitle>
        </DialogHeader>
        <Campo label="Nome" value={nome} onChange={setNome} />
        <div>
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
            <SelectTrigger className="mt-2 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="site_proprio">Site próprio</SelectItem>
              <SelectItem value="ota">OTA</SelectItem>
              <SelectItem value="parceiro">Parceiro</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            className="h-11 w-full"
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending}
          >
            {salvar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : canal ? (
              <Save className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {canal ? "Salvar" : "Criar canal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------- fornecedores
function AdminFornecedores() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-fornecedores"],
    queryFn: () => listarFornecedores(),
  });
  const [removendo, setRemovendo] = useState<string | null>(null);

  async function remover(f: Fornecedor) {
    if (
      !window.confirm(
        `Remover o acesso do motorista "${f.nome}"? Se ele já tiver corridas no histórico, o cadastro só é desativado e o login revogado — nada é apagado.`,
      )
    ) {
      return;
    }
    setRemovendo(f.id);
    try {
      const res = await removerCadastroMotorista(f.id);
      toast.success(
        res.removido ? "Motorista removido." : "Motorista desativado e login revogado.",
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-fornecedores"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover motorista.");
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-fluid-lg">Motoristas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fornecedores parceiros com acesso ao painel para ver as corridas atribuídas a eles.
          </p>
        </div>
        <NovoMotoristaDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !data?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum motorista cadastrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {data.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="font-medium">{f.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {[f.email, f.telefone, f.cidade_atuacao].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AtivoBadge ativo={f.ativo} />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removendo === f.id}
                  onClick={() => void remover(f)}
                >
                  {removendo === f.id ? <Loader2 className="size-4 animate-spin" /> : "Remover"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MOTORISTA_VAZIO = {
  nome: "",
  email: "",
  senha: "",
  telefone: "",
  cidade_atuacao: "",
  regiao_atuacao: "",
  categoria_veiculo_id: "" as string,
  observacoes_internas: "",
};

function NovoMotoristaDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(MOTORISTA_VAZIO);

  const { data: categorias } = useQuery({
    queryKey: ["admin-categorias-veiculo"],
    queryFn: () => listarCategoriasVeiculo(),
    enabled: open,
  });

  const criar = useMutation({
    mutationFn: async () => {
      if (!form.nome.trim() || !form.email.trim() || !form.cidade_atuacao.trim()) {
        throw new Error("Preencha nome, e-mail e cidade de atuação.");
      }
      if (form.senha.length < 8) throw new Error("A senha precisa ter no mínimo 8 caracteres.");
      await criarNovoMotorista({
        ...form,
        categoria_veiculo_id: form.categoria_veiculo_id || null,
      });
    },
    onSuccess: () => {
      toast.success("Motorista criado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-fornecedores"] });
      setOpen(false);
      setForm(MOTORISTA_VAZIO);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar motorista."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-11">
          <Plus className="size-4" /> Novo motorista
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo motorista</DialogTitle>
          <DialogDescription>
            Cria o login e o cadastro de fornecedor juntos — ele passa a poder entrar no painel para
            ver as corridas atribuídas a ele.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <Campo
            label="Nome"
            value={form.nome}
            onChange={(v) => setForm((f) => ({ ...f, nome: v }))}
          />
          <Campo
            label="E-mail (login)"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          />
          <Campo
            label="Senha (mín. 8 caracteres)"
            value={form.senha}
            onChange={(v) => setForm((f) => ({ ...f, senha: v }))}
          />
          <Campo
            label="Telefone"
            value={form.telefone}
            onChange={(v) => setForm((f) => ({ ...f, telefone: v }))}
          />
          <Campo
            label="Cidade de atuação"
            value={form.cidade_atuacao}
            onChange={(v) => setForm((f) => ({ ...f, cidade_atuacao: v }))}
          />
          <Campo
            label="Região (opcional)"
            value={form.regiao_atuacao}
            onChange={(v) => setForm((f) => ({ ...f, regiao_atuacao: v }))}
          />
          <div>
            <Label>Categoria de veículo</Label>
            <Select
              value={form.categoria_veiculo_id}
              onValueChange={(v) => setForm((f) => ({ ...f, categoria_veiculo_id: v }))}
            >
              <SelectTrigger className="mt-2 h-11">
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                {(categorias ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Observações internas</Label>
          <Textarea
            className="mt-2"
            rows={2}
            value={form.observacoes_internas}
            onChange={(e) => setForm((f) => ({ ...f, observacoes_internas: e.target.value }))}
          />
        </div>
        <DialogFooter>
          <Button className="h-11 w-full" onClick={() => criar.mutate()} disabled={criar.isPending}>
            {criar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Criar motorista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------- importação de planilha
// "Onde subimos as planilhas": lê um .xlsx/.csv no formato de exportação da
// plataforma "Sou Motorista" no navegador (nada sobe pro servidor sem
// validação antes) e manda só as linhas conferidas/selecionadas pro backend.
// Ver src/lib/vps/dados-despacho.functions.ts::vpsImportarPedidos.
type LinhaImportada = {
  ok: boolean;
  erro?: string | undefined;
  duplicada?: boolean;
  linha: PedidoImportRow;
  dataDisplay: string;
  canalNome?: string | undefined;
  categoriaNome?: string | undefined;
};

function stripPrefixo(v: unknown, prefixo: RegExp): string | null {
  if (!v) return null;
  const s = String(v)
    .trim()
    .replace(prefixo, "")
    .replace(/\.\s*$/, "")
    .trim();
  return s || null;
}

function primeiraCidade(v: unknown): string {
  if (!v) return "";
  const s = String(v).trim();
  const primeira = s.split(">")[0]?.trim() ?? "";
  const partes = primeira.split(" - ");
  return (partes.length > 1 ? partes.slice(1).join(" - ") : primeira).trim();
}

function parseDataBr(v: unknown): { iso: string; display: string } | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return { iso: v.toISOString(), display: v.toLocaleString("pt-BR") };
  }
  const s = String(v).trim();
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?/.exec(s);
  if (!m) return null;
  const [, dd, mm, yyyy, hh = "00", mi = "00"] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return { iso: d.toISOString(), display: d.toLocaleString("pt-BR") };
}

function combinarLookup(
  nome: string | undefined,
  lista: { id: string; nome: string }[],
): string | null {
  if (!nome) return null;
  const n = nome.trim().toLowerCase();
  return lista.find((x) => x.nome.trim().toLowerCase() === n)?.id ?? null;
}

function ImportarPedidosDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [linhas, setLinhas] = useState<LinhaImportada[]>([]);
  const [selecionadas, setSelecionadas] = useState<boolean[]>([]);
  const [lendo, setLendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState("");

  const { data: canais } = useQuery({
    queryKey: ["admin-canais-venda"],
    queryFn: () => listarCanaisVenda(),
    enabled: open,
  });
  const { data: categorias } = useQuery({
    queryKey: ["admin-categorias-veiculo"],
    queryFn: () => listarCategoriasVeiculo(),
    enabled: open,
  });

  const validas = linhas.filter((l, i) => l.ok && !l.duplicada && selecionadas[i]).length;

  async function lerArquivo(file: File) {
    setLendo(true);
    setNomeArquivo(file.name);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const primeiraAba = wb.SheetNames[0];
      if (!primeiraAba) throw new Error("Planilha vazia.");
      const ws = wb.Sheets[primeiraAba];
      if (!ws) throw new Error("Planilha vazia.");
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const codigos = raw
        .map((r) => String(r["Nº Pedido"] ?? "").trim())
        .filter((c) => c.length > 0);
      const existentes = new Set(codigos.length ? await verificarCodigosExistentes(codigos) : []);

      const parseadas: LinhaImportada[] = raw.map((r) => {
        const tipo = String(r["Tipo Serviço"] ?? "").toUpperCase();
        const direcao: "IN" | "OUT" = tipo.includes("OUT") ? "OUT" : "IN";
        const isIn = direcao === "IN";
        const hotel = isIn
          ? (stripPrefixo(r["Hotel In"], /^\s*in:\s*/i) ??
            stripPrefixo(r["Hotel Out"], /^\s*out:\s*/i))
          : (stripPrefixo(r["Hotel Out"], /^\s*out:\s*/i) ??
            stripPrefixo(r["Hotel In"], /^\s*in:\s*/i));
        const voo = isIn
          ? (stripPrefixo(r["Voo In"], /^\s*in:\s*/i) ?? stripPrefixo(r["Voo Out"], /^\s*out:\s*/i))
          : (stripPrefixo(r["Voo Out"], /^\s*out:\s*/i) ??
            stripPrefixo(r["Voo In"], /^\s*in:\s*/i));
        const dataFonte = isIn
          ? r["Data Voo In"] || r["Data Atividade"]
          : r["Data Voo Out"] || r["Data Atividade"];
        const dt = parseDataBr(dataFonte) ?? parseDataBr(r["Data Atividade"]);
        const passageiro = String(r["Pax"] ?? "").trim();
        const cidade = primeiraCidade(r["Cidade"] ?? (isIn ? r["Destino"] : r["Origem"]));
        const codigo = String(r["Nº Pedido"] ?? "").trim() || null;
        const canalNome = String(r["Empresa"] ?? "").trim() || undefined;
        const categoriaNome = String(r["Categoria"] ?? "").trim() || undefined;

        const erros: string[] = [];
        if (!passageiro) erros.push("Pax vazio");
        if (!cidade) erros.push("Cidade vazia");
        if (!dt) erros.push("Data inválida");

        const linha: PedidoImportRow = {
          codigo_reserva_canal: codigo,
          codigo_fornecedor_reserva: String(r["Pedido Fornecedor"] ?? "").trim() || null,
          passageiro_nome: passageiro,
          passageiro_telefone: String(r["Telefone Pax"] ?? "").trim() || null,
          cidade_atendimento: cidade,
          hotel,
          data_hora_encontro: dt?.iso ?? "",
          direcao,
          numero_voo: voo,
          ponto_partida: String(r["Origem"] ?? "").trim() || null,
          ponto_chegada: String(r["Destino"] ?? "").trim() || null,
          empresa_cliente_id: null,
          canal_venda_id: combinarLookup(canalNome, canais ?? []),
          categoria_veiculo_id: combinarLookup(categoriaNome, categorias ?? []),
        };

        return {
          ok: erros.length === 0,
          erro: erros.join(", ") || undefined,
          duplicada: codigo ? existentes.has(codigo) : false,
          linha,
          dataDisplay: dt?.display ?? "—",
          canalNome,
          categoriaNome,
        };
      });

      setLinhas(parseadas);
      setSelecionadas(parseadas.map((l) => l.ok && !l.duplicada));
    } catch (e) {
      toast.error("Falha ao ler planilha: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLendo(false);
    }
  }

  async function importar() {
    const payload = linhas
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => l.ok && !l.duplicada && selecionadas[i])
      .map(({ l }) => l.linha);
    if (payload.length === 0) {
      toast.error("Nenhuma linha válida selecionada.");
      return;
    }
    setImportando(true);
    try {
      const res = await importarPedidos(payload);
      toast.success(
        `${String(res.inseridos)} corridas importadas` +
          (res.ignorados > 0 ? ` · ${String(res.ignorados)} ignoradas (duplicadas)` : "") +
          ".",
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-corridas"] });
      setOpen(false);
      setLinhas([]);
      setSelecionadas([]);
      setNomeArquivo("");
    } catch (e) {
      toast.error("Falha na importação: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setImportando(false);
    }
  }

  const totalOk = linhas.filter((l) => l.ok && !l.duplicada).length;
  const totalDup = linhas.filter((l) => l.duplicada).length;
  const totalErr = linhas.filter((l) => !l.ok).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="h-11">
          <FileSpreadsheet className="size-4" /> Importar planilha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar corridas de uma planilha</DialogTitle>
          <DialogDescription>
            Aceita .xlsx/.csv no formato de exportação da plataforma "Sou Motorista". Nada é enviado
            até você conferir e clicar em importar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label className="text-xs">Arquivo .xlsx, .xls ou .csv</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="mt-1"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void lerArquivo(f);
                }}
              />
              {nomeArquivo && <p className="mt-1 text-xs text-muted-foreground">{nomeArquivo}</p>}
            </div>
            {linhas.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {totalOk} válidas · {totalDup} duplicadas · {totalErr} com erro
              </p>
            )}
          </div>

          {lendo && <p className="text-sm text-muted-foreground">Lendo planilha…</p>}

          {linhas.length > 0 && (
            <div className="max-h-[50vh] overflow-auto rounded border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Dir.</TableHead>
                    <TableHead>Passageiro</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l, i) => (
                    <TableRow key={i} className={!l.ok || l.duplicada ? "opacity-60" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selecionadas[i] ?? false}
                          disabled={!l.ok || l.duplicada}
                          onCheckedChange={(v) => {
                            const s = [...selecionadas];
                            s[i] = v === true;
                            setSelecionadas(s);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.linha.codigo_reserva_canal ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{l.dataDisplay}</TableCell>
                      <TableCell className="text-xs">{l.linha.direcao}</TableCell>
                      <TableCell className="max-w-40 truncate text-xs">
                        {l.linha.passageiro_nome || "—"}
                      </TableCell>
                      <TableCell className="text-xs">{l.linha.cidade_atendimento || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {l.linha.canal_venda_id ? (
                          l.canalNome
                        ) : l.canalNome ? (
                          <span className="text-amber-400">{l.canalNome} (não vinculado)</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.linha.categoria_veiculo_id ? (
                          l.categoriaNome
                        ) : l.categoriaNome ? (
                          <span className="text-amber-400">{l.categoriaNome} (não vinculada)</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {!l.ok ? (
                          <span className="text-red-400">{l.erro}</span>
                        ) : l.duplicada ? (
                          <span className="text-amber-400">Já existe</span>
                        ) : (
                          <span className="text-emerald-400">OK</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Canais/categorias que não batem com um cadastro existente ficam em branco na corrida —
            você vincula depois. Empresa cliente não é preenchida automaticamente.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={() => void importar()}
            disabled={importando || validas === 0}
            className="h-11"
          >
            {importando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            Importar {validas} corridas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminAgendamentos() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    "todos" | "atrasadas" | (typeof statusOpcoes)[number]
  >("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-agendamentos"],
    queryFn: () => listarAgendamentos(),
  });

  // Reaproveita a listagem de usuários (já dual-backend) só pra montar o
  // seletor de motoristas — nenhum endpoint novo de listagem precisou existir.
  const { data: usuarios } = useQuery({
    queryKey: ["usuarios-motoristas"],
    queryFn: () => listarUsuarios(),
  });
  const motoristas = useMemo(() => (usuarios ?? []).filter((u) => u.isMotorista), [usuarios]);
  const nomePorMotorista = useMemo(
    () => new Map((usuarios ?? []).map((u) => [u.id, u.nome || u.email])),
    [usuarios],
  );

  const atualizar = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await atualizarStatusAgendamento(id, status);
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-agendamentos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar."),
  });

  const atribuir = useMutation({
    mutationFn: async ({ id, motoristaId }: { id: string; motoristaId: string | null }) => {
      await atribuirMotorista(id, motoristaId);
    },
    onSuccess: () => {
      toast.success("Motorista atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-agendamentos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atribuir motorista."),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      await removerAgendamento(id);
    },
    onSuccess: () => {
      toast.success("Agendamento removido.");
      void queryClient.invalidateQueries({ queryKey: ["admin-agendamentos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover."),
  });

  const lista = useMemo(() => data ?? [], [data]);
  const contagem = contarStatus(lista);
  const totalAtrasadas = useMemo(() => lista.filter(estaAtrasada).length, [lista]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lista.filter((a) => {
      if (filtroStatus === "atrasadas" && !estaAtrasada(a)) return false;
      if (filtroStatus !== "todos" && filtroStatus !== "atrasadas" && a.status !== filtroStatus) {
        return false;
      }
      if (!termo) return true;
      return `${a.trecho} ${a.contato_nome ?? ""} ${a.contato_telefone ?? ""}`
        .toLowerCase()
        .includes(termo);
    });
  }, [lista, busca, filtroStatus]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      {MODO_VPS && (
        // Sprint 4 do roteiro "Despacho Unificado": desde o Sprint 3, toda
        // reserva nova também vira um pedido no car-fleet-co — é lá que o
        // despacho de verdade deve acontecer daqui pra frente. A atribuição
        // de motorista abaixo continua funcionando (não removida: serve de
        // reserva manual caso o car-fleet-co saia do ar), só deixou de ser
        // o caminho principal.
        <Alert>
          <Truck className="size-4" />
          <AlertTitle>O despacho agora acontece no car-fleet-co</AlertTitle>
          <AlertDescription>
            Toda reserva nova é enviada automaticamente pro backoffice de despacho — é lá que
            motorista, status e acompanhamento da corrida devem ser feitos. A atribuição de
            motorista aqui embaixo continua disponível como reserva manual, não é mais o caminho
            principal.
          </AlertDescription>
        </Alert>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Button
          variant={filtroStatus === "todos" ? "default" : "secondary"}
          className="h-11 shrink-0 whitespace-nowrap"
          onClick={() => setFiltroStatus("todos")}
        >
          Todos ({lista.length})
        </Button>
        {statusOpcoes.map((s) => (
          <Button
            key={s}
            variant={filtroStatus === s ? "default" : "secondary"}
            className="h-11 shrink-0 whitespace-nowrap"
            onClick={() => setFiltroStatus(s)}
          >
            {STATUS_META[s].label} ({contagem[s] ?? 0})
          </Button>
        ))}
        {totalAtrasadas > 0 && (
          <Button
            variant={filtroStatus === "atrasadas" ? "default" : "secondary"}
            className={cn(
              "h-11 shrink-0 whitespace-nowrap",
              filtroStatus !== "atrasadas" && "border border-amber-500/40 text-amber-300",
            )}
            onClick={() => setFiltroStatus("atrasadas")}
          >
            Atrasadas ({totalAtrasadas})
          </Button>
        )}
      </div>

      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-8"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, telefone ou trecho"
        />
      </div>

      {!lista.length ? (
        <p className="text-sm text-muted-foreground">Nenhum agendamento ainda.</p>
      ) : !filtrados.length ? (
        <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="space-y-4">
          {filtrados.map((a) => {
            const linkWhats = linkWhatsappCliente(a.contato_telefone);
            return (
              <article key={a.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg break-words">{a.trecho}</h2>
                      <StatusBadge status={a.status} />
                      {estaAtrasada(a) && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 text-amber-300"
                        >
                          Atrasada
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.data_viagem ?? "data a combinar"}
                      {a.hora ? ` · ${a.hora}` : ""} · carro {a.carro} · {a.periodo} ·{" "}
                      {a.passageiros} passageiro(s)
                      {a.valor ? ` · ${formatBRL(a.valor)}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.contato_nome ?? "sem nome"} · {a.contato_telefone ?? "sem telefone"}
                    </p>
                    {a.embarque_local ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Embarque: {a.embarque_local}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Motorista:{" "}
                      {a.motorista_id
                        ? (nomePorMotorista.get(a.motorista_id) ?? "—")
                        : "não atribuído"}
                    </p>
                    {a.observacoes ? <p className="mt-2 text-sm">{a.observacoes}</p> : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 lg:border-0 lg:pt-0">
                    {a.status === "pendente" && (
                      <Button
                        className="h-11 shrink-0"
                        disabled={atualizar.isPending}
                        onClick={() => atualizar.mutate({ id: a.id, status: "confirmado" })}
                      >
                        <Check className="size-4" /> Confirmar
                      </Button>
                    )}
                    <Select
                      value={a.status}
                      onValueChange={(status) => atualizar.mutate({ id: a.id, status })}
                    >
                      <SelectTrigger className="h-11 flex-1 text-sm lg:w-[170px] lg:flex-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOpcoes.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_META[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={a.motorista_id ?? "nenhum"}
                      onValueChange={(motoristaId) =>
                        atribuir.mutate({
                          id: a.id,
                          motoristaId: motoristaId === "nenhum" ? null : motoristaId,
                        })
                      }
                    >
                      <SelectTrigger className="h-11 flex-1 text-sm lg:w-[190px] lg:flex-none">
                        <SelectValue placeholder="Sem motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">Sem motorista</SelectItem>
                        {motoristas.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome || m.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {linkWhats ? (
                      <Button
                        asChild
                        size="icon"
                        variant="secondary"
                        className="size-11 shrink-0"
                        title="Falar no WhatsApp"
                      >
                        <a href={linkWhats} target="_blank" rel="noreferrer">
                          <MessageCircle className="size-4" />
                        </a>
                      </Button>
                    ) : null}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="size-11 shrink-0 text-destructive"
                      title="Remover agendamento"
                      onClick={() => {
                        if (window.confirm("Remover este agendamento?")) remover.mutate(a.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

type ConteudoItem = {
  id: string;
  chave: string;
  secao: string;
  titulo: string;
  texto: string;
  imagem: string;
  ordem: number;
};

function AdminConteudo() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-conteudo"],
    queryFn: () => listarConteudoAdmin(),
  });

  const criar = useMutation({
    mutationFn: async (chave: string) => {
      await criarBlocoConteudo(chave);
    },
    onSuccess: () => {
      toast.success("Bloco criado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-conteudo"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar bloco."),
  });

  const [novaChave, setNovaChave] = useState("");

  const grupos = useMemo(() => {
    const mapa = new Map<string, ConteudoItem[]>();
    for (const item of data ?? []) {
      const lista = mapa.get(item.secao) ?? [];
      lista.push(item);
      mapa.set(item.secao, lista);
    }
    return Array.from(mapa.entries());
  }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando conteúdo…</p>;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Cada bloco tem uma chave usada pelo site (ex.: <code>home_hero</code>,{" "}
        <code>frota_intro</code>, <code>contato_intro</code>). Edite título, texto e imagem e salve.
      </p>

      {grupos.map(([secao, itens]) => (
        <div key={secao} className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-wide text-muted-foreground">
            Seção: {secao}
          </h2>
          {itens.map((item) => (
            <ConteudoEditor key={item.id} item={item} />
          ))}
        </div>
      ))}

      <div className="rounded-lg border border-dashed border-border p-5">
        <Label>Novo bloco (chave)</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            className="h-11 sm:max-w-xs"
            value={novaChave}
            placeholder="ex.: home_promo"
            onChange={(e) => setNovaChave(e.target.value.replace(/[^\w-]/g, "_").toLowerCase())}
          />
          <Button
            variant="secondary"
            className="h-11"
            disabled={!novaChave || criar.isPending}
            onClick={() => {
              criar.mutate(novaChave);
              setNovaChave("");
            }}
          >
            Criar bloco
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConteudoEditor({ item }: { item: ConteudoItem }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(item);
  const [enviando, setEnviando] = useState(false);

  const salvar = useMutation({
    mutationFn: async () => {
      await salvarBlocoConteudo(form);
    },
    onSuccess: () => {
      toast.success("Conteúdo atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-conteudo"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const remover = useMutation({
    mutationFn: async () => {
      await removerBlocoConteudo(item.id);
    },
    onSuccess: () => {
      toast.success("Bloco removido.");
      void queryClient.invalidateQueries({ queryKey: ["admin-conteudo"] });
    },
  });

  async function enviarImagem(arquivo: File) {
    setEnviando(true);
    try {
      const url = await uploadImagem(arquivo, `conteudo/${item.chave}`);
      setForm((f) => ({ ...f, imagem: url }));
      toast.success("Imagem enviada. Clique em salvar para publicar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar imagem.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">{item.chave}</h2>
          <p className="text-xs text-muted-foreground">seção: {form.secao}</p>
        </div>
        {form.imagem ? (
          <img
            src={form.imagem}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            className="size-12 rounded-sm object-cover"
          />
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Campo label="Seção" value={form.secao} onChange={(v) => setForm({ ...form, secao: v })} />
        <CampoNumero
          label="Ordem"
          value={form.ordem}
          onChange={(v) => setForm({ ...form, ordem: v ?? 0 })}
        />
        <Campo
          label="Título"
          value={form.titulo}
          onChange={(v) => setForm({ ...form, titulo: v })}
        />
        <Campo
          label="URL da imagem"
          value={form.imagem}
          onChange={(v) => setForm({ ...form, imagem: v })}
        />
      </div>

      <div className="mt-4">
        <Label>Texto / descrição</Label>
        <Textarea
          className="mt-2"
          rows={3}
          value={form.texto}
          onChange={(e) => setForm({ ...form, texto: e.target.value })}
        />
      </div>

      <div className="mt-4">
        <Label>Enviar imagem</Label>
        <Input
          type="file"
          accept="image/*"
          className="mt-2 h-11 sm:max-w-xs"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            if (arquivo) void enviarImagem(arquivo);
          }}
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button
          className="h-11"
          onClick={() => salvar.mutate()}
          disabled={salvar.isPending || enviando}
        >
          {salvar.isPending || enviando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar bloco
        </Button>
        <Button
          variant="secondary"
          className="h-11"
          onClick={() => remover.mutate()}
          disabled={remover.isPending}
        >
          Remover
        </Button>
      </div>
    </article>
  );
}

function AdminUsuarios() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const carregarUsuarios = useServerFn(listUsuarios);
  const alterarPapel = useServerFn(definirPapelAdmin);
  const redefinirSenha = useServerFn(redefinirSenhaUsuario);
  const [busca, setBusca] = useState("");
  const [soAdmins, setSoAdmins] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: () => carregarUsuarios(),
  });

  const papel = useMutation({
    mutationFn: (vars: { userId: string; admin: boolean }) => alterarPapel({ data: vars }),
    onSuccess: () => {
      toast.success("Permissões atualizadas.");
      void queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar permissões."),
  });

  // Ao contrário do toggle de admin acima (que chama o server fn do Supabase
  // direto), este vai pelo dispatcher dual-backend em @/lib/dados — não
  // repete o gap de não funcionar em modo VPS.
  const papelMotorista = useMutation({
    mutationFn: (vars: { userId: string; motorista: boolean }) =>
      definirMotorista(vars.userId, vars.motorista),
    onSuccess: () => {
      toast.success("Permissões atualizadas.");
      void queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar permissões."),
  });

  const senha = useMutation({
    mutationFn: (vars: { userId: string; senha: string }) => redefinirSenha({ data: vars }),
    onSuccess: () => toast.success("Senha redefinida."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao redefinir a senha."),
  });

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let base = data ?? [];
    if (soAdmins) base = base.filter((u) => u.isAdmin);
    if (!termo) return base;
    return base.filter((u) =>
      [u.email, u.nome, u.telefone].some((c) => c.toLowerCase().includes(termo)),
    );
  }, [data, busca, soAdmins]);

  const totalAdmins = (data ?? []).filter((u) => u.isAdmin).length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-64" />
            <Skeleton className="mt-1 h-3 w-56" />
          </div>
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-red-400">
        {error instanceof Error ? error.message : "Não foi possível carregar os usuários."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.length ?? 0} contas · {totalAdmins} administrador(es). Promova, remova acessos ou
          redefina senhas.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={soAdmins ? "default" : "secondary"}
            className="h-11 shrink-0"
            onClick={() => setSoAdmins((v) => !v)}
          >
            Só admins ({totalAdmins})
          </Button>
          <div className="relative w-full sm:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por e-mail, nome ou WhatsApp"
              className="h-11 w-full pl-9 sm:w-72"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {lista.map((u) => (
          <UsuarioLinha
            key={u.id}
            usuario={u}
            euMesmo={u.id === user?.id}
            salvandoPapel={papel.isPending}
            salvandoPapelMotorista={papelMotorista.isPending}
            salvandoSenha={senha.isPending}
            onAlternarAdmin={() => papel.mutate({ userId: u.id, admin: !u.isAdmin })}
            onAlternarMotorista={() =>
              papelMotorista.mutate({ userId: u.id, motorista: !u.isMotorista })
            }
            onRedefinirSenha={(nova) => senha.mutate({ userId: u.id, senha: nova })}
          />
        ))}
        {!lista.length && (
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        )}
      </div>
    </div>
  );
}

function UsuarioLinha({
  usuario,
  euMesmo,
  salvandoPapel,
  salvandoPapelMotorista,
  salvandoSenha,
  onAlternarAdmin,
  onAlternarMotorista,
  onRedefinirSenha,
}: {
  usuario: UsuarioAdmin;
  euMesmo: boolean;
  salvandoPapel: boolean;
  salvandoPapelMotorista: boolean;
  salvandoSenha: boolean;
  onAlternarAdmin: () => void;
  onAlternarMotorista: () => void;
  onRedefinirSenha: (senha: string) => void;
}) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [confirmandoAdmin, setConfirmandoAdmin] = useState(false);
  const [confirmandoMotorista, setConfirmandoMotorista] = useState(false);

  const whats = linkWhatsappCliente(usuario.telefone || null);

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <span>{usuario.nome || "Sem nome"}</span>
            {usuario.isAdmin && (
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                Administrador
              </Badge>
            )}
            {usuario.isMotorista && (
              <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-400">
                Motorista
              </Badge>
            )}
            {euMesmo && <span className="text-xs text-muted-foreground">(você)</span>}
          </div>
          <p className="text-sm text-muted-foreground">{usuario.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {usuario.agendamentos} agendamento(s) ·{" "}
            {usuario.confirmado ? "e-mail confirmado" : "e-mail não confirmado"} · último acesso:{" "}
            {usuario.ultimoAcesso
              ? new Date(usuario.ultimoAcesso).toLocaleString("pt-BR")
              : "nunca"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {whats && (
            <Button variant="ghost" className="h-11" asChild>
              <a href={whats} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            </Button>
          )}
          <AlertDialog open={confirmandoAdmin} onOpenChange={setConfirmandoAdmin}>
            <Button
              variant={usuario.isAdmin ? "outline" : "secondary"}
              className="h-11"
              disabled={salvandoPapel || (euMesmo && usuario.isAdmin)}
              onClick={() => setConfirmandoAdmin(true)}
            >
              {usuario.isAdmin ? "Remover admin" : "Tornar admin"}
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="size-5 text-primary" />
                  {usuario.isAdmin
                    ? `Remover o acesso de administrador de ${usuario.nome || usuario.email}?`
                    : `Tornar ${usuario.nome || usuario.email} administrador?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {usuario.isAdmin
                    ? "A conta perde imediatamente o acesso a preços, rotas, agendamentos e dados de todos os clientes. Você pode conceder de novo depois, se precisar."
                    : "Um administrador tem acesso completo a preços, rotas, agendamentos e dados de todos os clientes. Só conceda isso a alguém em quem você confia totalmente."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
                <AlertDialogAction className="h-11" onClick={onAlternarAdmin}>
                  {usuario.isAdmin ? "Sim, remover admin" : "Sim, tornar administrador"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={confirmandoMotorista} onOpenChange={setConfirmandoMotorista}>
            <Button
              variant={usuario.isMotorista ? "outline" : "secondary"}
              className="h-11"
              disabled={salvandoPapelMotorista}
              onClick={() => setConfirmandoMotorista(true)}
            >
              {usuario.isMotorista ? "Remover motorista" : "Tornar motorista"}
            </Button>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {usuario.isMotorista
                    ? `Remover o acesso de motorista de ${usuario.nome || usuario.email}?`
                    : `Tornar ${usuario.nome || usuario.email} motorista?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {usuario.isMotorista
                    ? "A conta deixa de ver o painel de corridas atribuídas. Corridas já atribuídas continuam registradas, só ficam sem um motorista com acesso a elas até você reatribuir."
                    : "Um motorista pode ver e concluir as corridas que você atribuir a ele, no painel próprio dele — sem acesso a preços, rotas ou dados de outros clientes."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
                <AlertDialogAction className="h-11" onClick={onAlternarMotorista}>
                  {usuario.isMotorista ? "Sim, remover motorista" : "Sim, tornar motorista"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div>
          <Label htmlFor={`senha-${usuario.id}`} className="text-xs">
            Nova senha
          </Label>
          <Input
            id={`senha-${usuario.id}`}
            type="text"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            placeholder={SENHA_REGRA_TEXTO}
            className="mt-1 h-11 w-full sm:w-56"
          />
        </div>
        <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
          <Button
            variant="secondary"
            className="h-11"
            disabled={!senhaForte(novaSenha) || salvandoSenha}
            onClick={() => setConfirmando(true)}
          >
            {salvandoSenha ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <KeyRound className="size-4" />
            )}
            Redefinir senha
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-primary" />
                Redefinir a senha de {usuario.nome || usuario.email}?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    A senha de <strong className="text-foreground">{usuario.email}</strong> será
                    substituída imediatamente. Esta ação é irreversível: a senha atual deixa de
                    funcionar e a pessoa precisará usar a nova senha para entrar novamente.
                  </p>
                  {usuario.isAdmin && (
                    <p className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm font-medium text-red-300">
                      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Atenção: isso afeta outro administrador
                        {euMesmo ? " (a sua própria conta)" : ""}. Confirme com a pessoa antes de
                        prosseguir.
                      </span>
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="h-11"
                onClick={() => {
                  onRedefinirSenha(novaSenha);
                  setNovaSenha("");
                }}
              >
                Sim, redefinir senha
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </article>
  );
}
