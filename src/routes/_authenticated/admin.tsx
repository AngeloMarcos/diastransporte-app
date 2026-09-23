import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  BellRing,
  Building2,
  CalendarCheck,
  Car,
  Check,
  Copy,
  FileDown,
  FileSpreadsheet,
  FileText,
  History,
  Image as ImageIcon,
  Info,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Loader2,
  ExternalLink,
  LogOut,
  Menu,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Printer,
  Radio,
  Route as RouteIcon,
  Save,
  ScrollText,
  Search,
  ShieldAlert,
  StickyNote,
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

import { ConfirmarAcao } from "@/components/site/ConfirmarAcao";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
  atribuirMotoristaPedido,
  atualizarCanalVenda,
  atualizarCategoriaVeiculo,
  atualizarEmpresaCliente,
  atualizarPedido,
  atualizarStatusAgendamento,
  criarBlocoConteudo,
  criarCanalVenda,
  criarCategoriaVeiculo,
  criarEmpresaCliente,
  criarFotoGaleria,
  criarNovoMotorista,
  gerarConviteMotorista,
  criarPedido,
  criarRota,
  dashboardDespacho,
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
  listarAuditoria,
  listarUsuarios,
  pedidoDetalheAdmin,
  reativarMotorista,
  redefinirSenha,
  removerAgendamento,
  removerBlocoConteudo,
  removerCadastroMotorista,
  removerFotoGaleria,
  removerRota,
  removerVeiculoFrota,
  salvarBlocoConteudo,
  salvarFotoGaleria,
  salvarNotasFornecedor,
  salvarNotasInternas,
  atualizarLead,
  listarLeads,
  salvarRota,
  salvarVeiculoFrota,
  transicionarStatusPedido,
  verificarCodigosExistentes,
  type FiltroPedidosAdmin,
  type Fornecedor,
} from "@/lib/dados";
import {
  LEAD_STATUS,
  ROTULO_LEAD_STATUS,
  linkRespostaLead,
  linkTelefone,
  type LeadRow,
  type LeadStatus,
} from "@/lib/leads";
import type { PedidoImportRow } from "@/lib/vps/dados-despacho.functions";
import { encerrarSessaoAtual, useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-96.webp";
import { EMPRESA, formatBRL } from "@/data/rotas";
import {
  pedirPermissaoNotificacao,
  permissaoNotificacao,
  notificarNovaSolicitacao,
  tocarAlerta,
} from "@/lib/notificacoes";
import {
  contarStatus,
  statusOpcoes,
  STATUS_META,
  transicoesPermitidasAgendamento,
  type StatusAgendamento,
} from "@/lib/status";
import { senhaForte, SENHA_REGRA_TEXTO } from "@/lib/senha";
import type { RotaRow } from "@/lib/rotasMap";
import type {
  AuditoriaRow,
  FotoGaleriaRow,
  UsuarioAdmin,
  ValorAuditoria,
  VeiculoFrotaRow,
} from "@/lib/dados-tipos";
import { transicoesPermitidas, type PedidoStatus } from "@/lib/pedidos-transicoes";
import { PEDIDO_STATUS_META, PEDIDO_STATUS_OPTIONS, formatarDataHora } from "@/lib/pedidos-status";
import { comTempoLimite, mensagemAmigavel } from "@/lib/tempo-limite";
import { faltandoParaPublicarRota, faltandoParaPublicarVeiculo } from "@/lib/publicacao";
import { linkWhatsappConvite, mensagemConviteMotorista, montarLinkConvite } from "@/lib/convite";

// Achado revisando UX: a aba ativa era só useState — sem URL de verdade,
// não dava pra favoritar/compartilhar um link direto pra "Corridas" e um
// F5 sempre voltava pra "Visão geral", perdendo o lugar onde a pessoa
// estava. "aba" na query string resolve os dois; validação solta aqui (só
// string) porque a lista de abas válidas só existe mais
// abaixo no arquivo — o componente é quem decide o fallback pra "geral".
export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (busca: Record<string, unknown>): { aba?: string } =>
    typeof busca["aba"] === "string" ? { aba: busca["aba"] } : {},
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

// Achado revisando UX (pedido direto do usuário, com print do painel antigo
// do car-fleet-co ao lado): as 10 abas viviam soltas numa lista só,
// misturando gestão do site (Rotas/Frota/Agendamentos/Conteúdo/Usuários)
// com o despacho (Pedidos/Motoristas/Empresas/Canais/Categorias, todo
// portado do car-fleet-co) sem nenhuma separação visual — "confuso" nas
// palavras do usuário. Reordenado (site primeiro, despacho depois, "Visão
// geral" solta na frente por cobrir os dois) e agrupado na sidebar via
// GrupoLabel logo abaixo, igual ao menu do painel antigo. Renomeei
// "Corridas" pra "Pedidos" pra bater com o nome que o resto da tela de
// despacho já usa (tabela, filtros, dashboard).
const abas = [
  { id: "geral", label: "Visão geral", icon: LayoutDashboard },
  { id: "rotas", label: "Rotas e preços", icon: RouteIcon },
  { id: "frota", label: "Frota", icon: Truck },
  { id: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
  // Pedidos de orçamento do formulário de contato (migration 0017).
  { id: "leads", label: "Leads", icon: Inbox },
  { id: "conteudo", label: "Conteúdo do site", icon: FileText },
  { id: "usuarios", label: "Usuários e acessos", icon: Users },
  // Trilha de auditoria (migration 0012).
  { id: "auditoria", label: "Auditoria", icon: ScrollText },
  // Despacho (portado do car-fleet-co, Etapa 6/7 do roteiro da fusão).
  { id: "corridas", label: "Pedidos", icon: Car },
  { id: "fornecedores", label: "Motoristas", icon: UserCog },
  { id: "empresas", label: "Empresas", icon: Building2 },
  { id: "canais", label: "Canais de venda", icon: Radio },
  { id: "categorias", label: "Categorias", icon: Tag },
] as const;

function AdminPage() {
  const { user, isAdmin, carregando } = useAuth();
  const navigate = useNavigate();
  const queryClientSair = useQueryClient();
  const abasVisiveis = abas;
  // "aba" vem sempre da URL, não de um useState à parte — sem uma segunda
  // fonte de verdade não tem como o botão "voltar" do navegador ou um F5
  // ficarem fora de sincronia com o estado. Cai em "geral" se a query
  // string não tiver nada, tiver um valor desconhecido, ou apontar pra uma
  // aba que não existe.
  const { aba: abaBruta } = Route.useSearch();
  // Auditoria do site: /admin?aba=pedidos caía na Visão geral porque a chave
  // interna da aba é "corridas" (só o rótulo virou "Pedidos"). Aceita os
  // dois nomes — link que alguém monta pelo nome que vê no menu funciona.
  const abaNaUrl = abaBruta === "pedidos" ? "corridas" : abaBruta;
  const abaValida = abasVisiveis.find((a) => a.id === abaNaUrl);
  const aba = abaValida?.id ?? "geral";
  function setAba(novaAba: AbaId) {
    void navigate({ to: "/admin", search: { aba: novaAba }, replace: true });
  }
  const [menuAberto, setMenuAberto] = useState(false);
  const [permissaoNotif, setPermissaoNotif] = useState<NotificationPermission | null>(null);
  const idsPendentesVistos = useRef<Set<string> | null>(null);

  // "Sair" fica no rodapé do menu do painel (o cabeçalho do site não aparece aqui).
  async function sair() {
    await queryClientSair.cancelQueries();
    queryClientSair.clear();
    await encerrarSessaoAtual();
    void navigate({ to: "/", replace: true });
  }

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

  // Achado revisando UX: só Agendamentos tinha selo de pendência na barra,
  // mesmo com Corridas sendo hoje o fluxo principal do despacho (ver aviso
  // na aba Agendamentos) — um admin batendo o olho só na barra lateral
  // nunca notava corridas sem motorista esperando. Mesma queryKey de
  // AdminVisaoGeral (dashboardDespacho) — compartilha cache em vez de
  // duplicar a consulta quando as duas estão montadas.
  const { data: despachoLive } = useQuery({
    queryKey: ["admin-dashboard-despacho"],
    queryFn: () => dashboardDespacho(),
    enabled: isAdmin,
    refetchInterval: 30_000,
  });
  const semMotoristaCount = despachoLive?.semMotorista.length ?? 0;

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

  // Selo de "novos" na aba Leads — mesma cadência de atualização do despacho.
  const { data: leadsNovos } = useQuery({
    queryKey: ["admin-leads-novos"],
    queryFn: () => listarLeads({ status: "novo" }),
    enabled: isAdmin,
    refetchInterval: 60_000,
  });
  const leadsNovosCount = leadsNovos?.length ?? 0;

  const pendentesCount = (agendamentosLive ?? []).filter((a) => a.status === "pendente").length;

  if (carregando || !isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-sm text-muted-foreground">
        Verificando permissões…
      </main>
    );
  }

  const contadores = {
    agendamentos: pendentesCount,
    leads: leadsNovosCount,
    corridas: semMotoristaCount,
  };
  const abaAtual = abasVisiveis.find((a) => a.id === aba);
  const totalAvisos = pendentesCount + leadsNovosCount + semMotoristaCount;

  function selecionar(id: AbaId) {
    setAba(id);
    setMenuAberto(false);
  }

  // Painel em tela cheia: menu lateral fixo à esquerda e conteúdo à direita — sem o
  // cabeçalho e o rodapé do site público, que só aparecem para os visitantes. Em
  // telas estreitas o menu vira uma gaveta aberta por uma barra no topo.
  return (
    <Tabs
      value={aba}
      onValueChange={(v) => setAba(v as AbaId)}
      orientation="vertical"
      className="min-h-screen md:flex"
    >
      <aside className="hidden border-r border-border bg-card md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
        <MenuAdmin
          ativa={aba}
          abas={abasVisiveis}
          contadores={contadores}
          email={user?.email ?? ""}
          onSelecionar={selecionar}
          onSair={() => void sair()}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur md:hidden">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative size-11"
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
                {totalAvisos > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-primary" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 sm:max-w-xs">
              <SheetTitle className="sr-only">Menu do painel</SheetTitle>
              <SheetDescription className="sr-only">
                Escolha uma área do painel administrativo.
              </SheetDescription>
              <MenuAdmin
                ativa={aba}
                abas={abasVisiveis}
                contadores={contadores}
                email={user?.email ?? ""}
                onSelecionar={selecionar}
                onSair={() => void sair()}
              />
            </SheetContent>
          </Sheet>
          <p className="min-w-0 flex-1 truncate font-display text-lg">
            {abaAtual?.label ?? "Painel"}
          </p>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <h1 className="sr-only">Painel do administrador</h1>
          {permissaoNotif === "default" && (
            <button
              type="button"
              onClick={() => void pedirPermissaoNotificacao().then(setPermissaoNotif)}
              className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
            >
              <BellRing className="size-4" /> Ativar aviso no navegador para novas solicitações
            </button>
          )}
          {permissaoNotif === "denied" && (
            <p className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <BellRing className="size-3.5" /> Notificações do navegador bloqueadas — o aviso
              sonoro no painel continua funcionando.
            </p>
          )}

          <TabsContent value="geral" className="mt-0">
            <AdminVisaoGeral onIrPara={setAba} />
          </TabsContent>
          <TabsContent value="rotas" className="mt-0">
            <AdminRotas />
          </TabsContent>
          <TabsContent value="frota" className="mt-0">
            <AdminFrota />
          </TabsContent>
          <TabsContent value="agendamentos" className="mt-0">
            <AdminAgendamentos />
          </TabsContent>
          <TabsContent value="leads" className="mt-0">
            <AdminLeads />
          </TabsContent>
          <TabsContent value="corridas" className="mt-0">
            <AdminPedidos />
          </TabsContent>
          <TabsContent value="fornecedores" className="mt-0">
            <AdminFornecedores />
          </TabsContent>
          <TabsContent value="empresas" className="mt-0">
            <AdminEmpresas />
          </TabsContent>
          <TabsContent value="canais" className="mt-0">
            <AdminCanais />
          </TabsContent>
          <TabsContent value="categorias" className="mt-0">
            <AdminCategorias />
          </TabsContent>
          <TabsContent value="conteudo" className="mt-0">
            <AdminConteudo />
          </TabsContent>
          <TabsContent value="usuarios" className="mt-0">
            <AdminUsuarios />
          </TabsContent>
          <TabsContent value="auditoria" className="mt-0">
            <AdminAuditoria />
          </TabsContent>
        </main>
      </div>
    </Tabs>
  );
}

type AbaId = (typeof abas)[number]["id"];

/** Menu do painel: marca no topo, áreas agrupadas (Site / Despacho) no meio e, no
 * rodapé, o usuário, "Ver o site" e "Sair". Usado fixo na lateral (telas médias+)
 * e dentro da gaveta no celular. */
function MenuAdmin({
  ativa,
  abas: lista,
  contadores,
  email,
  onSelecionar,
  onSair,
}: {
  ativa: AbaId;
  abas: readonly (typeof abas)[number][];
  contadores: { agendamentos: number; leads: number; corridas: number };
  email: string;
  onSelecionar: (id: AbaId) => void;
  onSair: () => void;
}) {
  const aviso = (id: AbaId): { n: number; classe: string; titulo: string } | null => {
    if (id === "agendamentos" && contadores.agendamentos > 0)
      return {
        n: contadores.agendamentos,
        classe: "bg-primary text-primary-foreground",
        titulo: "Agendamentos pendentes",
      };
    if (id === "leads" && contadores.leads > 0)
      return {
        n: contadores.leads,
        classe: "bg-primary text-primary-foreground",
        titulo: "Leads novos",
      };
    if (id === "corridas" && contadores.corridas > 0)
      return {
        n: contadores.corridas,
        classe: "bg-amber-500 text-background",
        titulo: "Pedidos sem motorista atribuído",
      };
    return null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <img
          src={logo}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-sm object-contain"
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-base tracking-wide">{EMPRESA.nome}</p>
          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Administração
          </p>
        </div>
      </div>

      <nav aria-label="Menu do painel" className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {lista.map(({ id, label, icon: Icon }) => {
          const a = aviso(id);
          const selecionada = ativa === id;
          return (
            <Fragment key={id}>
              {id === "rotas" && <GrupoLabel texto="Site" />}
              {id === "corridas" && <GrupoLabel texto="Despacho" />}
              <button
                type="button"
                onClick={() => onSelecionar(id)}
                aria-current={selecionada ? "page" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  selecionada
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {a && (
                  <span
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                      a.classe,
                    )}
                    title={a.titulo}
                  >
                    {a.n}
                  </span>
                )}
              </button>
            </Fragment>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        {email && (
          <p className="truncate px-1 text-xs text-muted-foreground" title={email}>
            {email}
          </p>
        )}
        <Button asChild variant="outline" size="sm" className="h-10 w-full justify-start">
          <Link to="/">
            <ExternalLink className="size-4" /> Ver o site
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-10 w-full justify-start" onClick={onSair}>
          <LogOut className="size-4" /> Sair
        </Button>
      </div>
    </div>
  );
}

/** Título de grupo no menu do painel ("Site" / "Despacho"). */
function GrupoLabel({ texto }: { texto: string }) {
  return (
    <p className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
      {texto}
    </p>
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

  // Resumo do despacho (pedidos/corridas) — VPS-only, como o resto desse
  // domínio. Era a home própria do painel do car-fleet-co antes da fusão;
  // agora é só mais uma seção desta mesma aba.
  const { data: despacho, isLoading: carregandoDespacho } = useQuery({
    queryKey: ["admin-dashboard-despacho"],
    queryFn: () => dashboardDespacho(),
    refetchInterval: 30_000,
  });

  // Checklist de primeiros passos (auditoria do site, item 10): cada tela
  // vazia tinha só um texto, sem dizer POR ONDE começar. Reaproveita as
  // mesmas consultas (e chaves de cache) das abas — sem custo extra quando a
  // pessoa entra nelas depois.
  const { data: frotaLista } = useQuery({
    queryKey: ["admin-frota-veiculos"],
    queryFn: () => listarFrotaVeiculosAdmin(),
  });
  const { data: categoriasLista } = useQuery({
    queryKey: ["admin-categorias-veiculo"],
    queryFn: () => listarCategoriasVeiculo(),
  });
  const { data: motoristasLista } = useQuery({
    queryKey: ["admin-fornecedores"],
    queryFn: () => listarFornecedores(),
  });
  const { data: canaisLista } = useQuery({
    queryKey: ["admin-canais-venda"],
    queryFn: () => listarCanaisVenda(),
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

  const totalPedidos = Object.values(despacho?.porStatus ?? {}).reduce((soma, n) => soma + n, 0);
  const passos: { id: (typeof abas)[number]["id"]; titulo: string; ok: boolean; dica: string }[] = [
    {
      id: "rotas",
      titulo: "Cadastrar e ativar as rotas",
      ok: rotasAtivas > 0,
      dica: "Preços, foto e locais de embarque de cada trecho.",
    },
    {
      id: "frota",
      titulo: "Cadastrar a frota",
      ok: (frotaLista ?? []).some((v) => v.ativo),
      dica: "Um veículo por categoria, com foto — só aparece no site completo.",
    },
    {
      id: "categorias",
      titulo: "Criar as categorias de veículo",
      ok: (categoriasLista ?? []).length > 0,
      dica: "Usadas ao distribuir corridas e importar planilhas.",
    },
    {
      id: "fornecedores",
      titulo: "Cadastrar os motoristas",
      ok: (motoristasLista ?? []).length > 0,
      dica: "Cada um recebe um link para escolher a própria senha.",
    },
    {
      id: "canais",
      titulo: "Cadastrar os canais de venda",
      ok: (canaisLista ?? []).length > 0,
      dica: "De onde vêm os pedidos (site, agências, parceiros).",
    },
    {
      id: "corridas",
      titulo: "Receber o primeiro pedido",
      ok: totalPedidos > 0,
      dica: "Crie um manualmente, importe uma planilha ou espere uma reserva do site.",
    },
  ];
  const passosFeitos = passos.filter((p) => p.ok).length;

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

      {passosFeitos < passos.length && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg">Primeiros passos</h2>
            <p className="text-xs text-muted-foreground">
              {passosFeitos} de {passos.length} concluídos
            </p>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={passos.length}
            aria-valuenow={passosFeitos}
            aria-label="Progresso dos primeiros passos"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(passosFeitos / passos.length) * 100}%` }}
            />
          </div>
          <ul className="mt-4 divide-y divide-border">
            {passos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                      p.ok
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                        : "border-border text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="size-3" />
                  </span>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-medium", p.ok && "text-muted-foreground")}>
                      {p.titulo}
                      {p.ok && <span className="sr-only"> (concluído)</span>}
                    </p>
                    {!p.ok && <p className="text-xs text-muted-foreground">{p.dica}</p>}
                  </div>
                </div>
                {!p.ok && (
                  <Button size="sm" variant="secondary" onClick={() => onIrPara(p.id)}>
                    Ir agora
                  </Button>
                )}
              </li>
            ))}
          </ul>
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
          icon={Ban}
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

      <div className="space-y-6 border-t border-border pt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Despacho</h2>
          <Button
            variant="secondary"
            className="h-11 shrink-0"
            onClick={() => onIrPara("corridas")}
          >
            Ver pedidos
          </Button>
        </div>

        {carregandoDespacho ? (
          <p className="text-sm text-muted-foreground">Carregando despacho…</p>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-display text-lg">Status dos pedidos</h3>
              {(() => {
                const porStatus = despacho?.porStatus ?? {};
                const totalPedidos = Object.values(porStatus).reduce((s, n) => s + n, 0);
                // Achado revisando UX: a barra+legenda combinava todos os
                // status numa única linha corrida — difícil de bater o
                // olho e achar um número específico. Trocado por um grid
                // de blocos (um por status), igual ao dashboard que o
                // car-fleet-co tinha antes da fusão (print trazido pelo
                // usuário) — cada bloco já mostra o rótulo e a contagem.
                return totalPedidos ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {PEDIDO_STATUS_OPTIONS.map((s) => (
                      <div key={s} className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">
                          {PEDIDO_STATUS_META[s].label}
                        </p>
                        <p className="mt-1 font-display text-xl">{porStatus[s] ?? 0}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Nenhum pedido cadastrado ainda.
                  </p>
                );
              })()}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-display text-lg">Pedidos de hoje</h3>
                {despacho?.hoje.length ? (
                  <div className="mt-4 divide-y divide-border">
                    {despacho.hoje.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onIrPara("corridas")}
                        className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {p.passageiro_nome} · {p.cidade_atendimento}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatarDataHora(p.data_hora_encontro)} ·{" "}
                            {p.direcao === "IN" ? "Chegada" : "Saída"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={PEDIDO_STATUS_META[p.status as PedidoStatus].badgeClass}
                        >
                          {PEDIDO_STATUS_META[p.status as PedidoStatus].label}
                        </Badge>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Nenhum pedido hoje.</p>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-display text-lg">Sem motorista atribuído</h3>
                {despacho?.semMotorista.length ? (
                  <div className="mt-4 divide-y divide-border">
                    {despacho.semMotorista.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onIrPara("corridas")}
                        className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            #{p.id} · {p.passageiro_nome} · {p.cidade_atendimento}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatarDataHora(p.data_hora_encontro)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={PEDIDO_STATUS_META[p.status as PedidoStatus].badgeClass}
                        >
                          {PEDIDO_STATUS_META[p.status as PedidoStatus].label}
                        </Badge>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Todos os pedidos ativos têm motorista.
                  </p>
                )}
              </div>
            </div>
          </>
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

  if (isLoading) return <ListaCarregando />;

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

      {!data?.length ? (
        <ListaVazia
          icon={RouteIcon}
          titulo="Nenhuma rota cadastrada ainda"
          descricao='Cadastre a primeira com "Nova rota".'
        />
      ) : !filtradas.length ? (
        <ListaVazia
          icon={Search}
          titulo="Nenhuma rota encontrada"
          descricao="Tente outro termo de busca."
          acao={
            <Button size="sm" variant="outline" onClick={() => setBusca("")}>
              Limpar busca
            </Button>
          }
        />
      ) : (
        filtradas.map((rota) => <RotaEditor key={rota.id} rota={rota} />)
      )}
    </div>
  );
}

function RotaEditor({ rota }: { rota: RotaRow }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(rota);
  // Texto cru do <textarea> de embarque (um local por linha) — separar em
  // lista a cada tecla comeria a quebra de linha recém-digitada.
  const [embarqueTexto, setEmbarqueTexto] = useState(rota.embarque.join("\n"));
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const salvar = useMutation({
    mutationFn: async () => {
      const embarque = embarqueTexto
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      // Rota visível precisa de foto, resumo e preço (senão vai pro ar como
      // card com imagem vazia — auditoria do site). O servidor confere de novo.
      if (form.ativo) {
        const falta = faltandoParaPublicarRota(form);
        if (falta.length) {
          throw new Error(
            `Para deixar a rota visível falta: ${falta.join(", ")}. Complete ou desmarque "Rota visível no site".`,
          );
        }
      }
      await salvarRota({ ...form, embarque, id: rota.id });
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

  // Achado revisando UX: esconder/mostrar uma rota exigia "Editar" → rolar
  // até o checkbox → "Salvar alterações" (4 passos) — Categorias/Empresas/
  // Canais já fazem o mesmo conceito em 1 clique direto na linha da lista.
  // Usa `rota` (a prop, fonte de verdade) em vez de `form` (rascunho de
  // edição em andamento) — não depende de ter aberto "Editar" antes.
  const alternarAtivo = useMutation({
    mutationFn: async () => {
      if (!rota.ativo) {
        const falta = faltandoParaPublicarRota(rota);
        if (falta.length) {
          throw new Error(
            `Não dá pra ativar ainda — falta: ${falta.join(", ")}. Abra "Editar" e complete.`,
          );
        }
      }
      await salvarRota({ ...rota, ativo: !rota.ativo });
    },
    onSuccess: () => {
      toast.success(rota.ativo ? "Rota ocultada." : "Rota ativada.");
      void queryClient.invalidateQueries({ queryKey: ["admin-rotas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar."),
  });

  async function enviarFoto(arquivo: File, destino: "principal" | "galeria") {
    setEnviandoFoto(true);
    try {
      const url = await uploadImagem(arquivo);
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
          {/* Achado revisando imagens "quebradas" no admin: form.foto começa
              "" pra toda rota nova (o fluxo documentado é criar sem foto e
              editar depois) — um <img src=""> sem guarda mostra o ícone de
              imagem quebrada do navegador na LISTA inteira até alguém subir
              uma foto. Mesmo padrão de fallback já usado em
              AdminVeiculosLista (ícone Truck) e no editor de bloco de
              conteúdo (linha ~4722), só que faltava aqui. */}
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
              <RouteIcon className="size-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <h2 className="font-display text-lg">
              {rota.origem} → {rota.destino}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {formatBRL(rota.preco_pequeno)}
              <AtivoBadge ativo={rota.ativo} />
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
            variant="ghost"
            className="h-11 shrink-0"
            disabled={alternarAtivo.isPending}
            onClick={() => alternarAtivo.mutate()}
          >
            {rota.ativo ? "Inativar" : "Ativar"}
          </Button>
          <ConfirmarAcao
            titulo={`Remover a rota ${rota.origem} → ${rota.destino}?`}
            descricao="Essa ação não pode ser desfeita."
            textoConfirmar="Remover rota"
            onConfirmar={() => remover.mutate()}
            trigger={(abrir) => (
              <Button
                size="icon"
                variant="secondary"
                className="size-11 shrink-0 text-destructive"
                title="Remover rota"
                disabled={remover.isPending}
                onClick={abrir}
              >
                {remover.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            )}
          />
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
          {/* Sprint 3 (auditoria, A6): estes três só existiam no banco — o
              admin não conseguia marcar "somente ida", listar os locais de
              embarque nem ajustar a ordem de "Mais pedidos". */}
          <div className="grid gap-4 md:grid-cols-2">
            <CampoNumero
              label="Ordem em “Mais pedidos” (maior aparece primeiro)"
              value={form.popularidade}
              onChange={(v) => setForm({ ...form, popularidade: v ?? 0 })}
            />
            <label className="flex min-h-11 items-center gap-3 text-sm md:pt-7">
              <input
                type="checkbox"
                className="size-5"
                checked={form.ida_e_volta}
                onChange={(e) => setForm({ ...form, ida_e_volta: e.target.checked })}
              />
              Trecho disponível nos dois sentidos (ida e volta)
            </label>
          </div>
          <div>
            <Label>Locais de embarque (um por linha)</Label>
            <Textarea
              className="mt-2"
              rows={4}
              value={embarqueTexto}
              onChange={(e) => setEmbarqueTexto(e.target.value)}
              placeholder={"Aeroporto Marechal Cunha Machado (São Luís)\nCentro histórico"}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              É a lista que o cliente escolhe em “Zona de embarque” — e o que a busca do site usa
              (ex.: “aeroporto”).
            </p>
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
  // Sprint 3: número + categoria no lugar de "passageiros/bagagem" em texto
  // livre (o texto do site é composto a partir daqui, no servidor).
  categoria: null as "pequeno" | "grande" | null,
  capacidade_passageiros: null as number | null,
  malas: null as number | null,
  placa: null as string | null,
  foto: "",
  itens: [] as string[],
  ordem: 0,
};

/** Select de categoria do veículo (a mesma do tarifário: pequeno / grande). */
function CampoCategoriaVeiculo({
  value,
  onChange,
}: {
  value: "pequeno" | "grande" | null;
  onChange: (v: "pequeno" | "grande") => void;
}) {
  return (
    <div>
      <Label>Categoria (tarifário)</Label>
      <Select value={value ?? ""} onValueChange={(v) => onChange(v as "pequeno" | "grande")}>
        <SelectTrigger className="mt-2 h-11">
          <SelectValue placeholder="Escolha…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pequeno">Carro pequeno</SelectItem>
          <SelectItem value="grande">Carro grande</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

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
      toast.success(
        "Veículo criado como rascunho (oculto). Adicione a foto e ative quando estiver pronto.",
      );
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
          <DialogDescription>
            Entra oculto (rascunho). Adicione a foto e os itens na lista e ative — um veículo só
            fica visível no site com foto, modelo, categoria e capacidade.
          </DialogDescription>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoCategoriaVeiculo
            value={form.categoria}
            onChange={(v) => setForm((f) => ({ ...f, categoria: v }))}
          />
          <Campo
            label="Placa (opcional)"
            value={form.placa ?? ""}
            onChange={(v) => setForm((f) => ({ ...f, placa: v.trim() ? v : null }))}
          />
          <CampoNumero
            label="Capacidade (passageiros)"
            value={form.capacidade_passageiros}
            onChange={(v) => setForm((f) => ({ ...f, capacidade_passageiros: v }))}
          />
          <CampoNumero
            label="Malas"
            value={form.malas}
            onChange={(v) => setForm((f) => ({ ...f, malas: v }))}
          />
        </div>
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
  const [busca, setBusca] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-frota-veiculos"],
    queryFn: () => listarFrotaVeiculosAdmin(),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return data ?? [];
    return (data ?? []).filter((v) => `${v.nome} ${v.modelo ?? ""}`.toLowerCase().includes(termo));
  }, [data, busca]);

  if (isLoading) {
    return (
      <div className="mt-4">
        <ListaCarregando />
      </div>
    );
  }
  if (!data?.length) {
    return (
      <div className="mt-4">
        <ListaVazia
          icon={Truck}
          titulo="Nenhum veículo cadastrado ainda"
          descricao='Cadastre com "Novo veículo" — enquanto não houver nenhum, o site mostra os dois carros padrão.'
        />
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-4">
      <div className="relative sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-8"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou modelo"
        />
      </div>
      {!filtrados.length ? (
        <ListaVazia
          icon={Search}
          titulo="Nenhum veículo encontrado"
          descricao="Tente outro termo de busca."
          acao={
            <Button size="sm" variant="outline" onClick={() => setBusca("")}>
              Limpar busca
            </Button>
          }
        />
      ) : (
        filtrados.map((v) => <VeiculoEditor key={v.id} veiculo={v} />)
      )}
    </div>
  );
}

function VeiculoEditor({ veiculo }: { veiculo: VeiculoFrotaRow }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState(veiculo);
  const [novoItem, setNovoItem] = useState("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  // O que falta pra este veículo poder aparecer no site (ver lib/publicacao.ts).
  const faltas = faltandoParaPublicarVeiculo(veiculo);

  const salvar = useMutation({
    mutationFn: async () => {
      if (form.ativo) {
        const falta = faltandoParaPublicarVeiculo(form);
        if (falta.length) {
          throw new Error(
            `Para deixar o veículo visível falta: ${falta.join(", ")}. Complete ou desmarque "Visível no site".`,
          );
        }
      }
      await salvarVeiculoFrota(form);
    },
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

  // Mesmo achado de RotaEditor::alternarAtivo — 1 clique em vez de
  // Editar → rolar → Salvar. Usa `veiculo` (prop), não `form` (rascunho).
  const alternarAtivo = useMutation({
    mutationFn: async () => {
      if (!veiculo.ativo && faltas.length) {
        throw new Error(
          `Não dá pra ativar ainda — falta: ${faltas.join(", ")}. Abra "Editar" e complete.`,
        );
      }
      await salvarVeiculoFrota({ ...veiculo, ativo: !veiculo.ativo });
    },
    onSuccess: () => {
      toast.success(veiculo.ativo ? "Veículo ocultado." : "Veículo ativado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-frota-veiculos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar."),
  });

  async function enviarFoto(arquivo: File) {
    setEnviandoFoto(true);
    try {
      const url = await uploadImagem(arquivo);
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
              <AtivoBadge ativo={veiculo.ativo} />
              {!veiculo.ativo && faltas.length > 0 && (
                <span className="text-amber-400">rascunho — falta: {faltas.join(", ")}</span>
              )}
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
            variant="ghost"
            className="h-11 shrink-0"
            disabled={alternarAtivo.isPending}
            onClick={() => alternarAtivo.mutate()}
          >
            {veiculo.ativo ? "Inativar" : "Ativar"}
          </Button>
          <ConfirmarAcao
            titulo={`Remover "${veiculo.nome}"?`}
            descricao="Essa ação não pode ser desfeita."
            textoConfirmar="Remover veículo"
            onConfirmar={() => remover.mutate()}
            trigger={(abrir) => (
              <Button
                size="icon"
                variant="secondary"
                className="size-11 shrink-0 text-destructive"
                title="Remover veículo"
                disabled={remover.isPending}
                onClick={abrir}
              >
                {remover.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            )}
          />
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
            <CampoCategoriaVeiculo
              value={form.categoria}
              onChange={(v) => setForm({ ...form, categoria: v })}
            />
            <Campo
              label="Placa (opcional)"
              value={form.placa ?? ""}
              onChange={(v) => setForm({ ...form, placa: v.trim() ? v : null })}
            />
            <CampoNumero
              label="Capacidade (passageiros)"
              value={form.capacidade_passageiros}
              onChange={(v) => setForm({ ...form, capacidade_passageiros: v })}
            />
            <CampoNumero
              label="Malas"
              value={form.malas}
              onChange={(v) => setForm({ ...form, malas: v })}
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
      const url = await uploadImagem(arquivo);
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
      {/* NovaFotoGaleriaDialog exige uma foto pra criar o item, então
          foto.foto vazio não devia acontecer em uso normal — guarda mesmo
          assim (defensivo, mesmo padrão do resto do arquivo) em vez de
          confiar só na validação do formulário de criação. */}
      {foto.foto ? (
        <img
          src={foto.foto}
          alt={foto.alt}
          width={200}
          height={200}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="grid aspect-square w-full place-items-center">
          <ImageIcon className="size-6 text-muted-foreground" />
        </div>
      )}
      {!foto.ativo && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <AtivoBadge ativo={false} />
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
        <ConfirmarAcao
          titulo="Remover esta foto da galeria?"
          descricao="Essa ação não pode ser desfeita."
          textoConfirmar="Remover foto"
          onConfirmar={() => remover.mutate()}
          trigger={(abrir) => (
            <button
              type="button"
              aria-label="Remover foto"
              disabled={remover.isPending}
              onClick={abrir}
              className="grid size-8 shrink-0 place-items-center rounded-sm text-destructive hover:bg-secondary"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- corridas
// Despacho (portado do car-fleet-co, Etapa 6/7 do roteiro da fusão) — falta
// só o voucher em PDF (o resto: criar, importar em lote, transicionar
// status e atribuir motorista já estão aqui).
type CorridaRow = Awaited<ReturnType<typeof listarPedidosAdmin>>[number];

type PedidoFiltroDraft = {
  codigo: string;
  passageiro: string;
  cidade: string;
  direcao: "todas" | "IN" | "OUT";
  status: PedidoStatus | "todos";
  canal: string;
  empresa: string;
  fornecedor: string;
  tipoData: "atividade" | "emissao" | "alteracao";
  de: string;
  ate: string;
};

const PEDIDO_FILTRO_VAZIO: PedidoFiltroDraft = {
  codigo: "",
  passageiro: "",
  cidade: "",
  direcao: "todas",
  status: "todos",
  canal: "todos",
  empresa: "todas",
  fornecedor: "todos",
  tipoData: "atividade",
  de: "",
  ate: "",
};

// Monta o objeto por spread condicional (não atribuindo `undefined` a cada
// campo) porque tsconfig liga exactOptionalPropertyTypes — um campo opcional
// só pode estar ausente, nunca presente com valor undefined.
function paraFiltroAplicado(f: PedidoFiltroDraft): FiltroPedidosAdmin {
  const codigo = f.codigo.trim();
  const passageiro = f.passageiro.trim();
  const cidade = f.cidade.trim();
  return {
    ...(codigo && { codigo }),
    ...(passageiro && { passageiro }),
    ...(cidade && { cidade }),
    ...(f.direcao !== "todas" && { direcao: f.direcao }),
    ...(f.status !== "todos" && { status: f.status }),
    ...(f.canal !== "todos" && { canal: f.canal }),
    ...(f.empresa !== "todas" && { empresa: f.empresa }),
    ...(f.fornecedor !== "todos" && { fornecedor: f.fornecedor }),
    tipoData: f.tipoData,
    ...(f.de && { de: f.de }),
    ...(f.ate && { ate: f.ate }),
  };
}

/** Baixa um CSV com os pedidos atualmente carregados na tela — mesma técnica
 * (Blob + link temporário) do "Exportar CSV" que existia no painel próprio
 * do car-fleet-co antes da fusão. Exporta a página vista, não a base
 * inteira: é o que a pessoa está olhando na hora, filtros já aplicados. */
function exportarPedidosCSV(linhas: CorridaRow[]) {
  const cabecalho = [
    "id",
    "codigo",
    "canal",
    "empresa",
    "cidade",
    "hotel",
    "direcao",
    "passageiro",
    "data_encontro",
    "status",
    "motorista",
  ];
  const corpo = linhas.map((r) => [
    r.id,
    r.codigo_reserva_canal ?? "",
    r.canal_nome ?? "",
    r.empresa_nome ?? "",
    r.cidade_atendimento,
    r.hotel ?? "",
    r.direcao,
    r.passageiro_nome,
    r.data_hora_encontro,
    PEDIDO_STATUS_META[r.status as PedidoStatus].label,
    r.fornecedor_nome ?? "",
  ]);
  const csv = [cabecalho, ...corpo]
    .map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pedidos-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Achado revisando UX (pedido direto do usuário, com print da tela de
// Pedidos do painel antigo do car-fleet-co ao lado): a lista aqui era uma
// pilha de cards com só busca por texto + status — os filtros ricos que já
// existiam prontos no backend desde a Etapa 6 (listarPedidosAdmin aceita
// código/canal/empresa/motorista/direção/intervalo de datas, ver
// FiltroPedidosAdmin em dados.ts) nunca tinham UI nenhuma. Reescrito como
// tabela + painel de filtro completo, replicando as colunas e os campos de
// filtro exatos do print (Código/Passageiro/Cidade/Direção/Status/Canal/
// Empresa/Motorista/Tipo de data/De/Até), mais "Exportar CSV" (não existia
// aqui, existia lá). O filtro só dispara no clique de "Filtrar" — os campos
// de texto não buscam a cada tecla — pra não martelar o Postgres a cada
// letra digitada num filtro que pode ter vários campos preenchidos ao
// mesmo tempo.
function AdminPedidos() {
  const [draft, setDraft] = useState<PedidoFiltroDraft>(PEDIDO_FILTRO_VAZIO);
  const [aplicado, setAplicado] = useState<FiltroPedidosAdmin>({});
  const filtrosAtivos = Object.keys(aplicado).length > 0;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-corridas", aplicado],
    queryFn: () => listarPedidosAdmin(aplicado),
  });
  const { data: empresas } = useQuery({
    queryKey: ["admin-empresas-clientes"],
    queryFn: () => listarEmpresasClientes(),
  });
  const { data: canais } = useQuery({
    queryKey: ["admin-canais-venda"],
    queryFn: () => listarCanaisVenda(),
  });
  const { data: fornecedores } = useQuery({
    queryKey: ["admin-fornecedores"],
    queryFn: () => listarFornecedores(),
  });

  function limparFiltros() {
    setDraft(PEDIDO_FILTRO_VAZIO);
    setAplicado({});
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <ListaCarregando />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Pedidos</h2>
          <p className="text-sm text-muted-foreground">Todos os pedidos do despacho.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-11"
            onClick={() => exportarPedidosCSV(data ?? [])}
            disabled={!data?.length}
          >
            <FileDown className="size-4" /> Exportar CSV
          </Button>
          <ImportarPedidosDialog />
          <NovaCorridaDialog />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            label="Código"
            value={draft.codigo}
            onChange={(v) => setDraft((f) => ({ ...f, codigo: v }))}
          />
          <Campo
            label="Passageiro"
            value={draft.passageiro}
            onChange={(v) => setDraft((f) => ({ ...f, passageiro: v }))}
          />
          <Campo
            label="Cidade"
            value={draft.cidade}
            onChange={(v) => setDraft((f) => ({ ...f, cidade: v }))}
          />
          <div>
            <Label>Direção</Label>
            <Select
              value={draft.direcao}
              onValueChange={(v) =>
                setDraft((f) => ({ ...f, direcao: v as PedidoFiltroDraft["direcao"] }))
              }
            >
              <SelectTrigger className="mt-2 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="IN">Chegada (IN)</SelectItem>
                <SelectItem value="OUT">Saída (OUT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={draft.status}
              onValueChange={(v) =>
                setDraft((f) => ({ ...f, status: v as PedidoFiltroDraft["status"] }))
              }
            >
              <SelectTrigger className="mt-2 h-11">
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
          <div>
            <Label>Canal</Label>
            <Select
              value={draft.canal}
              onValueChange={(v) => setDraft((f) => ({ ...f, canal: v }))}
            >
              <SelectTrigger className="mt-2 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(canais ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Empresa</Label>
            <Select
              value={draft.empresa}
              onValueChange={(v) => setDraft((f) => ({ ...f, empresa: v }))}
            >
              <SelectTrigger className="mt-2 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {(empresas ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Motorista</Label>
            <Select
              value={draft.fornecedor}
              onValueChange={(v) => setDraft((f) => ({ ...f, fornecedor: v }))}
            >
              <SelectTrigger className="mt-2 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="none">Sem motorista</SelectItem>
                {(fornecedores ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo de data</Label>
            <Select
              value={draft.tipoData}
              onValueChange={(v) =>
                setDraft((f) => ({ ...f, tipoData: v as PedidoFiltroDraft["tipoData"] }))
              }
            >
              <SelectTrigger className="mt-2 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atividade">Atividade</SelectItem>
                <SelectItem value="emissao">Emissão</SelectItem>
                <SelectItem value="alteracao">Alteração</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>De</Label>
            <Input
              className="mt-2 h-11"
              type="date"
              value={draft.de}
              onChange={(e) => setDraft((f) => ({ ...f, de: e.target.value }))}
            />
          </div>
          <div>
            <Label>Até</Label>
            <Input
              className="mt-2 h-11"
              type="date"
              value={draft.ate}
              onChange={(e) => setDraft((f) => ({ ...f, ate: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {isFetching ? "Atualizando…" : `${data?.length ?? 0} pedido(s)`}
          </p>
          <div className="flex gap-2">
            {filtrosAtivos && (
              <Button size="sm" variant="ghost" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            )}
            <Button
              size="sm"
              className="h-11"
              onClick={() => setAplicado(paraFiltroAplicado(draft))}
            >
              Filtrar
            </Button>
          </div>
        </div>
      </div>

      {!data?.length ? (
        <ListaVazia
          icon={Car}
          titulo="Nenhum pedido encontrado"
          descricao={
            filtrosAtivos
              ? "Tente ajustar ou limpar os filtros."
              : 'Crie o primeiro com "Novo pedido" ou traga vários de uma vez com "Importar planilha".'
          }
          acao={
            filtrosAtivos && (
              <Button size="sm" variant="outline" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Passageiro</TableHead>
                <TableHead>Dir.</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs text-muted-foreground">{p.id}</TableCell>
                  <TableCell className="text-xs">{p.codigo_reserva_canal ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatarDataHora(p.data_hora_encontro)}
                  </TableCell>
                  <TableCell className="text-xs">{p.cidade_atendimento}</TableCell>
                  <TableCell className="max-w-40 truncate text-xs">{p.passageiro_nome}</TableCell>
                  <TableCell className="text-xs">{p.direcao}</TableCell>
                  <TableCell className="text-xs">{p.canal_nome ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {p.fornecedor_nome ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={PEDIDO_STATUS_META[p.status as PedidoStatus].badgeClass}
                    >
                      {PEDIDO_STATUS_META[p.status as PedidoStatus].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <CorridaDetalheDialog pedidoId={p.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// Ficha completa da corrida — o que a tabela não mostra: código de
// reserva/fornecedor, telefone do passageiro, pontos de embarque/desembarque,
// voo, observações internas (nunca vistas pelo motorista) e o histórico de
// status. Também é aqui (não mais na linha da tabela) que dá pra mudar
// status e motorista — consolidado num só lugar em vez de espalhado entre
// os cards da lista e esta ficha, como era antes da tabela.
type PedidoDetalheRow = NonNullable<Awaited<ReturnType<typeof pedidoDetalheAdmin>>>;

/** "YYYY-MM-DDTHH:mm" no fuso do NAVEGADOR, pro valor inicial de um
 * <input type="datetime-local">. Espelha o que NovaCorridaDialog já faz na
 * criação (lê o valor do input como hora local e manda
 * `new Date(v).toISOString()`) — mesma limitação existente ali (o horário
 * pretendido é sempre Maranhão/UTC-3, então só bate exato se quem está
 * editando também estiver nesse fuso), não uma regressão nova. */
function paraDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formularioDoPedido(p: PedidoDetalheRow) {
  return {
    codigo_reserva_canal: p.codigo_reserva_canal ?? "",
    codigo_fornecedor_reserva: p.codigo_fornecedor_reserva ?? "",
    empresa_cliente_id: p.empresa_cliente_id ?? "",
    canal_venda_id: p.canal_venda_id ?? "",
    cidade_atendimento: p.cidade_atendimento,
    hotel: p.hotel ?? "",
    data_hora_encontro: paraDatetimeLocal(p.data_hora_encontro),
    direcao: p.direcao,
    passageiro_nome: p.passageiro_nome,
    passageiro_telefone: p.passageiro_telefone ?? "",
    ponto_partida: p.ponto_partida ?? "",
    ponto_chegada: p.ponto_chegada ?? "",
    numero_voo: p.numero_voo ?? "",
    categoria_veiculo_id: p.categoria_veiculo_id ?? "",
  };
}

function CorridaDetalheDialog({ pedidoId }: { pedidoId: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notas, setNotas] = useState("");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<ReturnType<typeof formularioDoPedido> | null>(null);

  const { data: p, isLoading } = useQuery({
    queryKey: ["admin-corrida-detalhe", pedidoId],
    queryFn: () => pedidoDetalheAdmin(pedidoId),
    enabled: open,
  });

  useEffect(() => {
    if (p) {
      setNotas(p.observacoes_internas);
      setForm(formularioDoPedido(p));
    }
  }, [p]);

  // Achado revisando UX (pedido do usuário: "editar tudo"): antes desta
  // edição, um pedido só tinha status/motorista/observações internas
  // editáveis depois de criado — passageiro, cidade, data/hora, empresa,
  // canal, categoria etc. eram fixos pra sempre, sem conserto pra um erro
  // de digitação a não ser apagar e recriar (perdendo o histórico de
  // status). Reaproveita os mesmos cadastros de apoio já usados em
  // NovaCorridaDialog.
  const { data: categorias } = useQuery({
    queryKey: ["admin-categorias-veiculo"],
    queryFn: () => listarCategoriasVeiculo(),
    enabled: open,
  });
  const { data: empresas } = useQuery({
    queryKey: ["admin-empresas-clientes"],
    queryFn: () => listarEmpresasClientes(),
    enabled: open,
  });
  const { data: canais } = useQuery({
    queryKey: ["admin-canais-venda"],
    queryFn: () => listarCanaisVenda(),
    enabled: open,
  });

  const salvarEdicao = useMutation({
    mutationFn: async () => {
      if (!form) return;
      if (
        !form.passageiro_nome.trim() ||
        !form.cidade_atendimento.trim() ||
        !form.data_hora_encontro
      ) {
        throw new Error("Preencha passageiro, cidade e data/hora.");
      }
      await atualizarPedido({
        id: pedidoId,
        codigo_reserva_canal: form.codigo_reserva_canal.trim() || null,
        codigo_fornecedor_reserva: form.codigo_fornecedor_reserva.trim() || null,
        empresa_cliente_id: form.empresa_cliente_id || null,
        canal_venda_id: form.canal_venda_id || null,
        cidade_atendimento: form.cidade_atendimento,
        hotel: form.hotel.trim() || null,
        data_hora_encontro: new Date(form.data_hora_encontro).toISOString(),
        direcao: form.direcao,
        passageiro_nome: form.passageiro_nome,
        passageiro_telefone: form.passageiro_telefone.trim() || null,
        ponto_partida: form.ponto_partida.trim() || null,
        ponto_chegada: form.ponto_chegada.trim() || null,
        numero_voo: form.numero_voo.trim() || null,
        categoria_veiculo_id: form.categoria_veiculo_id || null,
      });
    },
    onSuccess: () => {
      toast.success("Pedido atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-corridas"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-corrida-detalhe", pedidoId] });
      setEditando(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar pedido."),
  });

  const salvarNotas = useMutation({
    mutationFn: () => salvarNotasInternas(pedidoId, notas),
    onSuccess: () => {
      toast.success("Observações salvas.");
      void queryClient.invalidateQueries({ queryKey: ["admin-corrida-detalhe", pedidoId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar observações."),
  });

  // Status e motorista mudavam direto no card da lista antes da tabela —
  // consolidado aqui na ficha (única tela que sobrou) pra não perder essa
  // ação. Invalida ["admin-corridas"] sem o segundo elemento da chave de
  // propósito: react-query casa por prefixo, então isso invalida a lista
  // não importa qual filtro esteja aplicado no momento.
  const { data: fornecedores } = useQuery({
    queryKey: ["admin-fornecedores"],
    queryFn: () => listarFornecedores(),
    enabled: open,
  });
  const fornecedoresAtivos = useMemo(
    () => (fornecedores ?? []).filter((f) => f.ativo),
    [fornecedores],
  );

  const mudarStatus = useMutation({
    mutationFn: (novoStatus: PedidoStatus) => transicionarStatusPedido(pedidoId, novoStatus),
    onSuccess: () => {
      toast.success("Status atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-corridas"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-corrida-detalhe", pedidoId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-despacho"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao mudar status."),
  });

  const mudarMotorista = useMutation({
    mutationFn: (fornecedorId: string | null) => atribuirMotoristaPedido(pedidoId, fornecedorId),
    onSuccess: () => {
      toast.success("Motorista atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-corridas"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-corrida-detalhe", pedidoId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-despacho"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atribuir motorista."),
  });

  async function baixarVoucher(autoprint: boolean) {
    if (!p) return;
    const { gerarVoucherPDF } = await import("@/lib/voucher");
    await gerarVoucherPDF(
      {
        id: p.id,
        codigo_reserva_canal: p.codigo_reserva_canal,
        codigo_fornecedor_reserva: p.codigo_fornecedor_reserva,
        passageiro_nome: p.passageiro_nome,
        passageiro_telefone: p.passageiro_telefone,
        cidade_atendimento: p.cidade_atendimento,
        hotel: p.hotel,
        direcao: p.direcao,
        data_hora_encontro: p.data_hora_encontro,
        ponto_partida: p.ponto_partida,
        ponto_chegada: p.ponto_chegada,
        numero_voo: p.numero_voo,
        status: p.status as PedidoStatus,
        observacao_motorista: p.observacao_motorista,
        empresa: p.empresa_nome,
        canal: p.canal_nome,
        categoria: p.categoria_nome,
        fornecedor: p.fornecedor_nome,
      },
      autoprint,
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setEditando(false);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" title="Ver detalhes e editar">
          <Info className="size-4" /> Abrir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pedido #{pedidoId}</DialogTitle>
        </DialogHeader>
        {isLoading || !p ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3 border-b border-border pb-4">
              <div className="min-w-[200px] flex-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={p.status}
                  onValueChange={(v) => mudarStatus.mutate(v as PedidoStatus)}
                  disabled={mudarStatus.isPending}
                >
                  <SelectTrigger
                    className={cn(
                      "mt-1.5 h-11",
                      PEDIDO_STATUS_META[p.status as PedidoStatus].badgeClass,
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      p.status as PedidoStatus,
                      ...transicoesPermitidas(p.status as PedidoStatus, "admin"),
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {PEDIDO_STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[200px] flex-1">
                <Label className="text-xs">Motorista</Label>
                <Select
                  value={p.fornecedor_id ?? "none"}
                  onValueChange={(v) => mudarMotorista.mutate(v === "none" ? null : v)}
                  disabled={mudarMotorista.isPending || fornecedoresAtivos.length === 0}
                >
                  <SelectTrigger className="mt-1.5 h-11">
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
                {fornecedoresAtivos.length === 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Nenhum motorista ativo — cadastre um na aba{" "}
                    <span className="font-medium text-foreground">Motoristas</span>.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {editando ? "Editando dados do pedido" : "Dados do pedido"}
              </h3>
              {editando ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditando(false);
                      setForm(formularioDoPedido(p));
                    }}
                    disabled={salvarEdicao.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => salvarEdicao.mutate()}
                    disabled={salvarEdicao.isPending}
                  >
                    {salvarEdicao.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Salvar alterações
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
                  <Pencil className="size-4" /> Editar
                </Button>
              )}
            </div>

            {editando && form ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Campo
                  label="Código reserva (canal)"
                  value={form.codigo_reserva_canal}
                  onChange={(v) => setForm((f) => (f ? { ...f, codigo_reserva_canal: v } : f))}
                />
                <Campo
                  label="Código no fornecedor"
                  value={form.codigo_fornecedor_reserva}
                  onChange={(v) => setForm((f) => (f ? { ...f, codigo_fornecedor_reserva: v } : f))}
                />
                <Campo
                  label="Passageiro"
                  value={form.passageiro_nome}
                  onChange={(v) => setForm((f) => (f ? { ...f, passageiro_nome: v } : f))}
                />
                <Campo
                  label="WhatsApp"
                  value={form.passageiro_telefone}
                  onChange={(v) => setForm((f) => (f ? { ...f, passageiro_telefone: v } : f))}
                />
                <Campo
                  label="Cidade de atendimento"
                  value={form.cidade_atendimento}
                  onChange={(v) => setForm((f) => (f ? { ...f, cidade_atendimento: v } : f))}
                />
                <div>
                  <Label>Data e hora do encontro</Label>
                  <Input
                    className="mt-2 h-11"
                    type="datetime-local"
                    value={form.data_hora_encontro}
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, data_hora_encontro: e.target.value } : f))
                    }
                  />
                </div>
                <div>
                  <Label>Direção</Label>
                  <Select
                    value={form.direcao}
                    onValueChange={(v) =>
                      setForm((f) => (f ? { ...f, direcao: v as "IN" | "OUT" } : f))
                    }
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
                  <Label>Empresa cliente</Label>
                  <div className="mt-2 flex gap-2">
                    <Select
                      value={form.empresa_cliente_id}
                      onValueChange={(v) =>
                        setForm((f) => (f ? { ...f, empresa_cliente_id: v } : f))
                      }
                    >
                      <SelectTrigger className="h-11 flex-1">
                        <SelectValue placeholder="Sem empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {(empresas ?? []).map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <NovaEmpresaDialogInline />
                  </div>
                </div>
                <div>
                  <Label>Canal de venda</Label>
                  <div className="mt-2 flex gap-2">
                    <Select
                      value={form.canal_venda_id}
                      onValueChange={(v) => setForm((f) => (f ? { ...f, canal_venda_id: v } : f))}
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
                <div>
                  <Label>Categoria de veículo</Label>
                  <div className="mt-2 flex gap-2">
                    <Select
                      value={form.categoria_veiculo_id}
                      onValueChange={(v) =>
                        setForm((f) => (f ? { ...f, categoria_veiculo_id: v } : f))
                      }
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
                <Campo
                  label="Hotel/pousada"
                  value={form.hotel}
                  onChange={(v) => setForm((f) => (f ? { ...f, hotel: v } : f))}
                />
                <Campo
                  label="Número do voo"
                  value={form.numero_voo}
                  onChange={(v) => setForm((f) => (f ? { ...f, numero_voo: v } : f))}
                />
                <Campo
                  label="Ponto de partida"
                  value={form.ponto_partida}
                  onChange={(v) => setForm((f) => (f ? { ...f, ponto_partida: v } : f))}
                />
                <Campo
                  label="Ponto de chegada"
                  value={form.ponto_chegada}
                  onChange={(v) => setForm((f) => (f ? { ...f, ponto_chegada: v } : f))}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <InfoCampo label="Passageiro" valor={p.passageiro_nome} />
                <InfoCampo label="Cidade" valor={p.cidade_atendimento} />
                <InfoCampo label="Data/hora" valor={formatarDataHora(p.data_hora_encontro)} />
                <InfoCampo label="Empresa" valor={p.empresa_nome} />
                <InfoCampo label="Canal" valor={p.canal_nome} />
                <InfoCampo label="Código canal" valor={p.codigo_reserva_canal} />
                <InfoCampo label="Código fornecedor" valor={p.codigo_fornecedor_reserva} />
                <InfoCampo label="Telefone" valor={p.passageiro_telefone} />
                <InfoCampo label="Hotel" valor={p.hotel} />
                <InfoCampo label="Partida" valor={p.ponto_partida} />
                <InfoCampo label="Chegada" valor={p.ponto_chegada} />
                <InfoCampo label="Voo" valor={p.numero_voo} />
                <InfoCampo label="Categoria" valor={p.categoria_nome} />
                <InfoCampo label="Emitido em" valor={formatarDataHora(p.data_emissao)} />
                <InfoCampo label="Alterado em" valor={formatarDataHora(p.data_alteracao)} />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void baixarVoucher(true)}>
                <Printer className="size-4" /> Imprimir voucher
              </Button>
              <Button size="sm" variant="outline" onClick={() => void baixarVoucher(false)}>
                <FileDown className="size-4" /> Baixar PDF
              </Button>
            </div>

            <div>
              <Label>Observações internas</Label>
              <p className="mb-2 text-xs text-muted-foreground">Nunca visíveis pro motorista.</p>
              <Textarea
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ex.: cliente pediu cadeirinha de bebê, confirmar por WhatsApp antes."
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Observação do motorista: {p.observacao_motorista ?? "—"}
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => salvarNotas.mutate()}
                disabled={salvarNotas.isPending}
              >
                {salvarNotas.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Salvar observações
              </Button>
            </div>

            <div>
              <Label className="flex items-center gap-1.5">
                <History className="size-3.5" /> Histórico de status
              </Label>
              {!p.historico.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sem alterações registradas ainda.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-xs">
                  {p.historico.map((h) => (
                    <li key={h.id} className="flex flex-wrap gap-1.5">
                      <span className="text-muted-foreground">
                        {formatarDataHora(h.created_at)}
                      </span>
                      <span>
                        {h.status_anterior
                          ? PEDIDO_STATUS_META[h.status_anterior as PedidoStatus].label
                          : "—"}
                        {" → "}
                        {PEDIDO_STATUS_META[h.status_novo as PedidoStatus].label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoCampo({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words">{valor ?? "—"}</p>
    </div>
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
  // Achado revisando UX: faltava aqui (nunca dava pra escolher Empresa ao
  // criar uma corrida manual, só quando ela vinha por importação).
  empresa_cliente_id: "" as string,
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
  const { data: empresas } = useQuery({
    queryKey: ["admin-empresas-clientes"],
    queryFn: () => listarEmpresasClientes(),
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
        empresa_cliente_id: form.empresa_cliente_id || null,
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
      toast.success("Pedido criado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-corridas"] });
      setOpen(false);
      setForm(CORRIDA_VAZIA);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar pedido."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-11">
          <Plus className="size-4" /> Novo pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo pedido</DialogTitle>
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
          <div>
            <Label>Empresa cliente</Label>
            <div className="mt-2 flex gap-2">
              <Select
                value={form.empresa_cliente_id}
                onValueChange={(v) => setForm((f) => ({ ...f, empresa_cliente_id: v }))}
              >
                <SelectTrigger className="h-11 flex-1">
                  <SelectValue placeholder="Sem empresa" />
                </SelectTrigger>
                <SelectContent>
                  {(empresas ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NovaEmpresaDialogInline />
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
            Criar pedido
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

// Achado revisando UX: Categoria e Canal já tinham este "+" de criação
// rápida ao lado do Select, direto no formulário de corrida — só Empresa
// não (nem tinha o próprio Select de Empresa, ver NovaCorridaDialog e
// CorridaDetalheDialog). Mesmo padrão minimalista das outras duas: só nome,
// sem os campos extras (documento/e-mail/telefone) que EmpresaDialog pede —
// quem precisar deles edita depois na aba Empresas.
function NovaEmpresaDialogInline() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");

  const criar = useMutation({
    mutationFn: async () => {
      if (!nome.trim()) throw new Error("Informe o nome da empresa.");
      await criarEmpresaCliente({
        nome: nome.trim(),
        documento: null,
        email_contato: null,
        telefone_contato: null,
      });
    },
    onSuccess: () => {
      toast.success("Empresa criada.");
      void queryClient.invalidateQueries({ queryKey: ["admin-empresas-clientes"] });
      setOpen(false);
      setNome("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao criar empresa."),
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
          <DialogTitle>Nova empresa cliente</DialogTitle>
        </DialogHeader>
        <Campo label="Nome" value={nome} onChange={setNome} />
        <DialogFooter>
          <Button className="h-11 w-full" onClick={() => criar.mutate()} disabled={criar.isPending}>
            {criar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Criar empresa
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

/** Placeholder de carregamento pras listas do despacho — no lugar de um "Carregando…" mudo. */
function ListaCarregando({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-64" />
        </div>
      ))}
    </div>
  );
}

/** Estado vazio das listas do despacho — tanto "nada cadastrado" quanto "nada bate com o filtro". */
function ListaVazia({
  icon: Icon,
  titulo,
  descricao,
  acao,
}: {
  icon: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-10 text-center">
      <Icon className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">{titulo}</p>
      {descricao && <p className="max-w-sm text-xs text-muted-foreground">{descricao}</p>}
      {acao}
    </div>
  );
}

function AdminCategorias() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-categorias-veiculo"],
    queryFn: () => listarCategoriasVeiculo(),
  });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return data ?? [];
    return (data ?? []).filter((c) => c.nome.toLowerCase().includes(termo));
  }, [data, busca]);

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
            {isLoading
              ? "Sedan, SUV, van — usadas para casar cada corrida com o tipo de carro certo."
              : `${String(data?.length ?? 0)} cadastrada(s) — sedan, SUV, van, usadas para casar cada corrida com o tipo de carro certo.`}
          </p>
        </div>
        <CategoriaDialog />
      </div>

      {!isLoading && Boolean(data?.length) && (
        <div className="relative sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome"
          />
        </div>
      )}

      {isLoading ? (
        <ListaCarregando />
      ) : !data?.length ? (
        <ListaVazia
          icon={Tag}
          titulo="Nenhuma categoria cadastrada ainda"
          descricao="Cadastre as categorias de veículo pra poder casar cada corrida com o carro certo."
        />
      ) : !filtradas.length ? (
        <ListaVazia
          icon={Search}
          titulo="Nenhuma categoria encontrada"
          descricao="Tente outro termo de busca."
          acao={
            <Button size="sm" variant="outline" onClick={() => setBusca("")}>
              Limpar busca
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtradas.map((c) => (
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
  const [busca, setBusca] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-empresas-clientes"],
    queryFn: () => listarEmpresasClientes(),
  });

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return data ?? [];
    return (data ?? []).filter((e) =>
      [e.nome, e.documento, e.email_contato, e.telefone_contato]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo),
    );
  }, [data, busca]);

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
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "Agências, OTAs e clientes B2B."
              : `${String(data?.length ?? 0)} cadastrada(s) — agências, OTAs e clientes B2B.`}
          </p>
        </div>
        <EmpresaDialog />
      </div>

      {!isLoading && Boolean(data?.length) && (
        <div className="relative sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, documento ou contato"
          />
        </div>
      )}

      {isLoading ? (
        <ListaCarregando />
      ) : !data?.length ? (
        <ListaVazia
          icon={Building2}
          titulo="Nenhuma empresa cadastrada ainda"
          descricao="Cadastre agências, OTAs ou clientes B2B pra vincular às corridas deles."
        />
      ) : !filtradas.length ? (
        <ListaVazia
          icon={Search}
          titulo="Nenhuma empresa encontrada"
          descricao="Tente outro termo de busca."
          acao={
            <Button size="sm" variant="outline" onClick={() => setBusca("")}>
              Limpar busca
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtradas.map((e) => (
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
  const [busca, setBusca] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-canais-venda"],
    queryFn: () => listarCanaisVenda(),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return data ?? [];
    return (data ?? []).filter((c) => c.nome.toLowerCase().includes(termo));
  }, [data, busca]);

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
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "OTAs, agências e canais diretos."
              : `${String(data?.length ?? 0)} cadastrado(s) — OTAs, agências e canais diretos.`}
          </p>
        </div>
        <CanalDialog />
      </div>

      {!isLoading && Boolean(data?.length) && (
        <div className="relative sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome"
          />
        </div>
      )}

      {isLoading ? (
        <ListaCarregando />
      ) : !data?.length ? (
        <ListaVazia
          icon={Radio}
          titulo="Nenhum canal cadastrado ainda"
          descricao="Cadastre os canais de venda pra saber de onde cada corrida veio."
        />
      ) : !filtrados.length ? (
        <ListaVazia
          icon={Search}
          titulo="Nenhum canal encontrado"
          descricao="Tente outro termo de busca."
          acao={
            <Button size="sm" variant="outline" onClick={() => setBusca("")}>
              Limpar busca
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtrados.map((c) => (
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
// fornecedores_notas_internas era só-escrita: dava pra preencher na criação
// do motorista, mas nunca mais ver/editar depois. Mesmo padrão de
// observações internas de corrida (CorridaDetalheDialog acima).
// Achado revisando UX: motorista desativado (histórico preservado, login
// revogado) não tinha NENHUM jeito de voltar — só dava pra criar um cadastro
// novo do zero pra mesma pessoa. Precisa de e-mail/senha novos porque o
// usuarios original foi apagado de vez (ver vpsReativarMotorista).
function ReativarMotoristaDialog({ fornecedor: f }: { fornecedor: Fornecedor }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(f.email ?? "");
  const [senha, setSenha] = useState("");

  const reativar = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error("Informe o e-mail de login.");
      if (!senhaForte(senha)) throw new Error(SENHA_REGRA_TEXTO);
      await reativarMotorista(f.id, email.trim(), senha);
    },
    onSuccess: () => {
      toast.success("Motorista reativado — novo login criado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-fornecedores"] });
      setOpen(false);
      setSenha("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao reativar motorista."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="h-9">
          Reativar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reativar {f.nome}</DialogTitle>
          <DialogDescription>
            O login antigo foi revogado — crie um e-mail e senha novos pra essa mesma pessoa voltar
            a acessar o painel. O histórico de corridas dela continua intacto.
          </DialogDescription>
        </DialogHeader>
        <Campo label="E-mail (login)" value={email} onChange={setEmail} />
        <Campo label="Senha (mín. 8 caracteres)" value={senha} onChange={setSenha} />
        <DialogFooter>
          <Button
            className="h-11 w-full"
            onClick={() => reativar.mutate()}
            disabled={reativar.isPending}
          >
            {reativar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserCog className="size-4" />
            )}
            Reativar motorista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotasFornecedorDialog({ fornecedor: f }: { fornecedor: Fornecedor }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notas, setNotas] = useState(f.observacoes_internas ?? "");

  const salvar = useMutation({
    mutationFn: () => salvarNotasFornecedor(f.id, notas),
    onSuccess: () => {
      toast.success("Observações salvas.");
      void queryClient.invalidateQueries({ queryKey: ["admin-fornecedores"] });
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar observações."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setNotas(f.observacoes_internas ?? "");
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-9 shrink-0", f.observacoes_internas && "text-primary")}
          title="Observações internas"
        >
          <StickyNote className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Observações internas — {f.nome}</DialogTitle>
          <DialogDescription>Nunca visíveis pro motorista, só pro admin.</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ex.: prefere corridas noturnas, veículo alugado até dezembro."
        />
        <DialogFooter>
          <Button
            className="h-11 w-full"
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending}
          >
            {salvar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminFornecedores() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-fornecedores"],
    queryFn: () => listarFornecedores(),
  });
  const [removendo, setRemovendo] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return data ?? [];
    return (data ?? []).filter((f) =>
      [f.nome, f.email, f.telefone, f.cidade_atuacao]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo),
    );
  }, [data, busca]);

  async function remover(f: Fornecedor) {
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
            {isLoading
              ? "Fornecedores parceiros com acesso ao painel para ver as corridas atribuídas a eles."
              : `${String(data?.length ?? 0)} cadastrado(s) — fornecedores parceiros com acesso ao painel para ver as corridas atribuídas a eles.`}
          </p>
        </div>
        <NovoMotoristaDialog />
      </div>

      {!isLoading && Boolean(data?.length) && (
        <div className="relative sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou cidade"
          />
        </div>
      )}

      {isLoading ? (
        <ListaCarregando />
      ) : !data?.length ? (
        <ListaVazia
          icon={UserCog}
          titulo="Nenhum motorista cadastrado ainda"
          descricao="Cadastre o primeiro motorista para poder atribuí-lo a uma corrida."
        />
      ) : !filtrados.length ? (
        <ListaVazia
          icon={Search}
          titulo="Nenhum motorista encontrado"
          descricao="Tente outro termo de busca."
          acao={
            <Button size="sm" variant="outline" onClick={() => setBusca("")}>
              Limpar busca
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtrados.map((f) => (
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
                {!f.ativo && <ReativarMotoristaDialog fornecedor={f} />}
                {f.ativo && <BotaoLinkAcesso fornecedor={f} />}
                <NotasFornecedorDialog fornecedor={f} />
                <ConfirmarAcao
                  titulo={`Remover o acesso do motorista "${f.nome}"?`}
                  descricao="Se ele já tiver corridas no histórico, o cadastro só é desativado e o login revogado — nada é apagado."
                  textoConfirmar="Remover acesso"
                  onConfirmar={() => void remover(f)}
                  trigger={(abrir) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0 text-destructive"
                      title={`Remover ${f.nome}`}
                      disabled={removendo === f.id}
                      onClick={abrir}
                    >
                      {removendo === f.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  )}
                />
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
  telefone: "",
  cidade_atuacao: "",
  regiao_atuacao: "",
  categoria_veiculo_id: "" as string,
  observacoes_internas: "",
};

type ConviteGerado = { token: string; nome: string; telefone: string | null };

// Sprint 3 (auditoria, A6): antes o admin DIGITAVA a senha do motorista. Agora
// o sistema gera um link de uso único (7 dias) e o próprio motorista escolhe
// a senha. Sem e-mail (o app não tem provedor): o admin copia o link ou
// manda direto pelo WhatsApp do motorista.
function ConviteMotoristaDialog({
  convite,
  onClose,
}: {
  convite: ConviteGerado | null;
  onClose: () => void;
}) {
  const link = convite ? montarLinkConvite(window.location.origin, convite.token) : "";
  const whatsapp = convite
    ? linkWhatsappConvite(convite.telefone, mensagemConviteMotorista(convite.nome, link))
    : null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não consegui copiar — selecione o texto do link e copie manualmente.");
    }
  }

  return (
    <Dialog
      open={convite !== null}
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link de acesso de {convite?.nome}</DialogTitle>
          <DialogDescription>
            Mande este link para o motorista: ele escolhe a própria senha e já entra no painel. Vale
            por 7 dias e só pode ser usado uma vez.
          </DialogDescription>
        </DialogHeader>
        <Input
          readOnly
          value={link}
          className="h-11 font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Link de acesso"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-11 flex-1" variant="secondary" onClick={() => void copiar()}>
            <Copy className="size-4" /> Copiar link
          </Button>
          {whatsapp && (
            <Button
              asChild
              className="h-11 flex-1 bg-whats text-whats-foreground hover:bg-whats/90"
            >
              <a href={whatsapp} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" /> Enviar pelo WhatsApp
              </a>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Este link aparece só agora — o sistema guarda apenas uma versão criptografada. Se perder,
          gere outro (o anterior deixa de valer).
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Botão "gerar link de acesso" da linha do motorista (convite perdido ou
 * "esqueci minha senha" — o app não tem e-mail, então o admin manda o link). */
function BotaoLinkAcesso({ fornecedor: f }: { fornecedor: Fornecedor }) {
  const [convite, setConvite] = useState<ConviteGerado | null>(null);
  const gerar = useMutation({
    mutationFn: () => gerarConviteMotorista(f.id),
    onSuccess: (r) => setConvite(r),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao gerar o link."),
  });
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-9 shrink-0"
        title={`Gerar link de acesso para ${f.nome}`}
        aria-label={`Gerar link de acesso para ${f.nome}`}
        disabled={gerar.isPending}
        onClick={() => gerar.mutate()}
      >
        {gerar.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
      </Button>
      <ConviteMotoristaDialog convite={convite} onClose={() => setConvite(null)} />
    </>
  );
}

function NovoMotoristaDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(MOTORISTA_VAZIO);
  const [convite, setConvite] = useState<ConviteGerado | null>(null);

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
      return criarNovoMotorista({
        ...form,
        categoria_veiculo_id: form.categoria_veiculo_id || null,
      });
    },
    onSuccess: (r) => {
      toast.success("Motorista criado. Envie o link de acesso para ele.");
      void queryClient.invalidateQueries({ queryKey: ["admin-fornecedores"] });
      setOpen(false);
      setConvite({ token: r.conviteToken, nome: form.nome, telefone: form.telefone || null });
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
            Cria o cadastro e gera um link de acesso: o motorista escolhe a própria senha e passa a
            poder entrar no painel para ver as corridas atribuídas a ele.
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
      <ConviteMotoristaDialog convite={convite} onClose={() => setConvite(null)} />
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

  if (isLoading) return <ListaCarregando />;

  return (
    <div className="space-y-4">
      // Desde a fusão (Etapa 6 do roteiro), toda reserva nova também vira // um pedido na aba
      "Pedidos" deste mesmo painel — não é mais outro // app (o texto antigo aqui apontava pro
      car-fleet-co como sistema // separado, o que deixou de existir). A atribuição de motorista //
      abaixo continua funcionando como reserva manual, só deixou de ser // o caminho principal.
      <Alert>
        <Truck className="size-4" />
        <AlertTitle>O despacho agora acontece na aba "Pedidos"</AlertTitle>
        <AlertDescription>
          <Link
            to="/admin"
            search={{ aba: "corridas" }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Abrir Pedidos
          </Link>
          . Toda reserva nova vira automaticamente um pedido ali — é lá que motorista, status e
          acompanhamento devem ser feitos. A atribuição de motorista aqui embaixo continua
          disponível como reserva manual, não é mais o caminho principal.
        </AlertDescription>
      </Alert>
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
        <ListaVazia icon={CalendarCheck} titulo="Nenhum agendamento ainda" />
      ) : !filtrados.length ? (
        <ListaVazia
          icon={Search}
          titulo="Nenhum agendamento encontrado"
          descricao="Tente outro termo de busca ou outro status."
          acao={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setBusca("");
                setFiltroStatus("todos");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
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
                    {a.pedido_id ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Despacho: pedido #{a.pedido_id} (aba Pedidos)
                      </p>
                    ) : null}
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
                        {/* Achado revisando UX: este Select listava TODOS os
                            status sem checar se a transição fazia sentido —
                            dava pra "desconcluir" uma viagem de volta pra
                            pendente sem querer. O backend já valida
                            (transicaoValidaAgendamento, ver dados.functions.ts),
                            aqui só espelha isso na lista de opções, mesmo
                            padrão já usado no Select de status de Corridas. */}
                        {[
                          a.status,
                          ...transicoesPermitidasAgendamento(a.status as StatusAgendamento),
                        ].map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_META[s as StatusAgendamento].label}
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
                    <ConfirmarAcao
                      titulo="Remover este agendamento?"
                      descricao="Essa ação não pode ser desfeita."
                      textoConfirmar="Remover agendamento"
                      onConfirmar={() => remover.mutate(a.id)}
                      trigger={(abrir) => (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="size-11 shrink-0 text-destructive"
                          title="Remover agendamento"
                          onClick={abrir}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    />
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
      const url = await uploadImagem(arquivo);
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
        <ConfirmarAcao
          titulo={`Remover o bloco "${item.chave}"?`}
          descricao="Esse bloco deixa de existir no conteúdo do site — se ele estiver em uso em alguma página (ex.: home_hero), o texto/imagem some de lá. Essa ação não pode ser desfeita."
          textoConfirmar="Remover bloco"
          onConfirmar={() => remover.mutate()}
          trigger={(abrir) => (
            <Button
              variant="secondary"
              className="h-11"
              onClick={abrir}
              disabled={remover.isPending}
            >
              Remover
            </Button>
          )}
        />
      </div>
    </article>
  );
}

// ------------------------------------------------------------- auditoria
// Trilha de "quem mudou o quê e quando" (tabela public.auditoria). Antes
// disto a única marca era uma linha de console.log nos logs do container
// (src/lib/auditoria.ts, commit "interino") — sumia com a rotação do log e
// ninguém do lado do negócio conseguia consultar. Só leitura: a tabela é
// append-only no banco (a role da aplicação nem tem UPDATE/DELETE nela).
const ENTIDADES_AUDITORIA = [
  ["rota", "Rotas e preços"],
  ["agendamento", "Agendamentos"],
  ["pedido", "Pedidos"],
  ["conteudo", "Conteúdo do site"],
  ["frota", "Frota"],
  ["galeria", "Galeria"],
  ["usuario", "Usuários"],
  ["motorista", "Motoristas"],
  ["categoria", "Categorias"],
  ["empresa", "Empresas"],
  ["canal", "Canais de venda"],
  ["lead", "Leads"],
] as const;

const ROTULO_ENTIDADE: Record<string, string> = Object.fromEntries(ENTIDADES_AUDITORIA);

const ROTULO_ACAO: Record<string, string> = {
  criar: "Criou",
  editar: "Editou",
  remover: "Removeu",
  status: "Mudou status",
  ativar: "Ativou",
  desativar: "Desativou",
  reativar: "Reativou",
  importar: "Importou",
  atribuir_motorista: "Atribuiu motorista",
  remover_motorista: "Removeu motorista",
  promover_admin: "Promoveu admin",
  remover_admin: "Removeu admin",
  promover_motorista: "Deu acesso motorista",
  redefinir_senha: "Redefiniu senha",
};

function formatarValorAuditoria(v: ValorAuditoria | undefined): string {
  if (v === undefined || v === null || v === "") return "—";
  if (Array.isArray(v)) return `${String(v.length)} item(ns)`;
  if (typeof v === "boolean") return v ? "sim" : "não";
  return String(v);
}

function classeAcaoAuditoria(acao: string): string {
  if (acao === "remover" || acao === "desativar" || acao === "remover_admin")
    return "border-red-500/30 bg-red-500/10 text-red-400";
  if (acao === "criar" || acao === "ativar" || acao === "reativar")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  return "border-border bg-muted text-muted-foreground";
}

function AuditoriaLinha({ e }: { e: AuditoriaRow }) {
  const campos = Array.from(
    new Set([...Object.keys(e.antes ?? {}), ...Object.keys(e.depois ?? {})]),
  );
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-xs">{formatarDataHora(e.quando)}</TableCell>
      <TableCell className="max-w-48 truncate text-xs">{e.usuario_email || "—"}</TableCell>
      <TableCell>
        <Badge variant="outline" className={classeAcaoAuditoria(e.acao)}>
          {ROTULO_ACAO[e.acao] ?? e.acao}
        </Badge>
      </TableCell>
      <TableCell className="text-xs">{ROTULO_ENTIDADE[e.entidade] ?? e.entidade}</TableCell>
      <TableCell className="min-w-64 text-xs">
        <p className="break-words">{e.resumo}</p>
        {campos.length > 0 && (
          <details className="mt-1">
            <summary className="cursor-pointer text-muted-foreground">Ver alterações</summary>
            <ul className="mt-1 space-y-0.5">
              {campos.map((c) => (
                <li key={c} className="break-words">
                  <span className="text-muted-foreground">{c}:</span>{" "}
                  {formatarValorAuditoria(e.antes?.[c])} →{" "}
                  <span className="text-foreground">{formatarValorAuditoria(e.depois?.[c])}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------- leads
// Pedidos de orçamento do formulário de contato (public.leads). O cliente
// também é mandado ao WhatsApp da empresa; aqui fica o registro pra ninguém
// se perder e dar pra acompanhar (novo → contatado → virou reserva).
const CLASSE_LEAD_STATUS: Record<LeadStatus, string> = {
  novo: "border-primary/40 bg-primary/15 text-primary",
  contatado: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  convertido: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  descartado: "border-border bg-muted text-muted-foreground",
};

function AdminLeads() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"todos" | LeadStatus>("todos");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-leads", status, buscaAplicada],
    queryFn: () =>
      listarLeads({
        ...(status !== "todos" && { status }),
        ...(buscaAplicada && { busca: buscaAplicada }),
      }),
    refetchOnWindowFocus: true,
  });

  const atualizar = useMutation({
    mutationFn: atualizarLead,
    onSuccess: () => {
      toast.success("Lead atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-leads-novos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar o lead."),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl">Leads</h2>
        <p className="text-sm text-muted-foreground">
          Pedidos de orçamento enviados pelo formulário do site. Responda pelo WhatsApp e vá
          marcando o andamento.
        </p>
      </div>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(ev) => {
          ev.preventDefault();
          setBuscaAplicada(busca.trim());
        }}
      >
        <Select value={status} onValueChange={(v) => setStatus(v as "todos" | LeadStatus)}>
          <SelectTrigger className="h-11 sm:w-48" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {LEAD_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {ROTULO_LEAD_STATUS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou trecho"
          />
        </div>
        <Button type="submit" className="h-11">
          Buscar
        </Button>
      </form>

      {isLoading ? (
        <ListaCarregando />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Não foi possível carregar os leads</AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          </AlertDescription>
        </Alert>
      ) : !data?.length ? (
        <ListaVazia
          icon={Inbox}
          titulo="Nenhum lead"
          descricao={
            status !== "todos" || buscaAplicada
              ? "Nenhum lead bate com esse filtro."
              : "Quando alguém pedir orçamento pelo site, aparece aqui."
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {isFetching ? "Atualizando…" : `${String(data.length)} lead(s)`}
          </p>
          <ul className="space-y-3">
            {data.map((l) => (
              <LeadCard
                key={l.id}
                lead={l}
                salvando={atualizar.isPending && atualizar.variables.id === l.id}
                onAtualizar={(dados) => atualizar.mutate({ id: l.id, ...dados })}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LeadCard({
  lead,
  salvando,
  onAtualizar,
}: {
  lead: LeadRow;
  salvando: boolean;
  onAtualizar: (dados: { status?: LeadStatus; notaInterna?: string }) => void;
}) {
  const [nota, setNota] = useState(lead.nota_interna ?? "");
  const notaMudou = nota.trim() !== (lead.nota_interna ?? "");
  const whats = linkRespostaLead(lead, lead.telefone);
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{lead.nome}</p>
          <p className="text-xs text-muted-foreground">{formatarDataHora(lead.created_at)}</p>
        </div>
        <Badge variant="outline" className={CLASSE_LEAD_STATUS[lead.status]}>
          {ROTULO_LEAD_STATUS[lead.status]}
        </Badge>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="inline text-muted-foreground">Telefone: </dt>
          <dd className="inline">{lead.telefone}</dd>
        </div>
        {lead.trecho && (
          <div>
            <dt className="inline text-muted-foreground">Trecho: </dt>
            <dd className="inline">{lead.trecho}</dd>
          </div>
        )}
        {lead.data_viagem && (
          <div>
            <dt className="inline text-muted-foreground">Data da viagem: </dt>
            <dd className="inline">
              {new Date(`${lead.data_viagem}T12:00:00`).toLocaleDateString("pt-BR")}
            </dd>
          </div>
        )}
        {lead.observacoes && (
          <div className="sm:col-span-2">
            <dt className="inline text-muted-foreground">Observações: </dt>
            <dd className="inline whitespace-pre-line">{lead.observacoes}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        {whats && (
          <Button
            asChild
            size="sm"
            className="h-11 bg-whats text-whats-foreground hover:bg-whats/90"
          >
            <a href={whats} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" /> Responder no WhatsApp
            </a>
          </Button>
        )}
        <Button asChild size="sm" variant="outline" className="h-11">
          <a href={linkTelefone(lead.telefone)}>
            <Phone className="size-4" /> Ligar
          </a>
        </Button>
        <Select
          value={lead.status}
          onValueChange={(v) => onAtualizar({ status: v as LeadStatus })}
          disabled={salvando}
        >
          <SelectTrigger className="h-11 w-44" aria-label="Status do lead">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {ROTULO_LEAD_STATUS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <Textarea
          rows={2}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={1000}
          placeholder="Nota interna (só o admin vê)"
          aria-label="Nota interna"
          className="sm:flex-1"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-11"
          disabled={!notaMudou || salvando}
          onClick={() => onAtualizar({ notaInterna: nota.trim() })}
        >
          {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{" "}
          Salvar nota
        </Button>
      </div>
    </li>
  );
}

function AdminAuditoria() {
  const [entidade, setEntidade] = useState("todas");
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-auditoria", entidade, buscaAplicada],
    queryFn: () =>
      listarAuditoria({
        ...(entidade !== "todas" && { entidade }),
        ...(buscaAplicada && { busca: buscaAplicada }),
      }),
    refetchOnWindowFocus: true,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl">Auditoria</h2>
        <p className="text-sm text-muted-foreground">
          Quem mudou o quê e quando no painel. Só leitura — o histórico não pode ser editado nem
          apagado.
        </p>
      </div>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(ev) => {
          ev.preventDefault();
          setBuscaAplicada(busca.trim());
        }}
      >
        <Select value={entidade} onValueChange={setEntidade}>
          <SelectTrigger className="h-11 sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as áreas</SelectItem>
            {ENTIDADES_AUDITORIA.map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por descrição ou e-mail"
          />
        </div>
        <Button type="submit" className="h-11">
          Buscar
        </Button>
      </form>

      {isLoading ? (
        <ListaCarregando />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Não foi possível carregar a auditoria</AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          </AlertDescription>
        </Alert>
      ) : !data?.length ? (
        <ListaVazia
          icon={ScrollText}
          titulo="Nenhum registro"
          descricao={
            entidade !== "todas" || buscaAplicada
              ? "Nenhum evento bate com esse filtro."
              : "As próximas alterações feitas no painel aparecem aqui."
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {isFetching ? "Atualizando…" : `${String(data.length)} evento(s) mais recentes`}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Quem</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>O que mudou</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((e) => (
                  <AuditoriaLinha key={e.id} e={e} />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function AdminUsuarios() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [soAdmins, setSoAdmins] = useState(false);
  const [soMotoristas, setSoMotoristas] = useState(false);

  // Tempo limite: sem ele, uma chamada pendurada deixava o skeleton eterno, sem
  // nunca chegar no "Tentar de novo".
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: () => comTempoLimite(listarUsuarios(), 20_000),
    retry: 1,
  });

  const papel = useMutation({
    mutationFn: (vars: { userId: string; admin: boolean }) => definirAdmin(vars.userId, vars.admin),
    onSuccess: () => {
      toast.success("Permissões atualizadas.");
      void queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar permissões."),
  });

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
    mutationFn: (vars: { userId: string; senha: string }) =>
      redefinirSenha(vars.userId, vars.senha),
    onSuccess: () => toast.success("Senha redefinida."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao redefinir a senha."),
  });

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let base = data ?? [];
    if (soAdmins) base = base.filter((u) => u.isAdmin);
    if (soMotoristas) base = base.filter((u) => u.isMotorista);
    if (!termo) return base;
    return base.filter((u) =>
      [u.email, u.nome, u.telefone].some((c) => c.toLowerCase().includes(termo)),
    );
  }, [data, busca, soAdmins, soMotoristas]);

  const totalAdmins = (data ?? []).filter((u) => u.isAdmin).length;
  const totalMotoristas = (data ?? []).filter((u) => u.isMotorista).length;

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
    // O erro real vai pro console; na tela só a mensagem amigável — nunca
    // texto de infraestrutura pro cliente.
    console.error("[admin] falha ao carregar usuários:", error);
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Não foi possível carregar os usuários</AlertTitle>
        <AlertDescription>
          <p>{mensagemAmigavel(error, "Tente de novo em instantes.")}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="size-4 animate-spin" /> : null} Tentar de novo
          </Button>
        </AlertDescription>
      </Alert>
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
          <Button
            variant={soMotoristas ? "default" : "secondary"}
            className="h-11 shrink-0"
            onClick={() => setSoMotoristas((v) => !v)}
          >
            Só motoristas ({totalMotoristas})
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
