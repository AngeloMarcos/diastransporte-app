import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  FileText,
  KeyRound,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Plus,
  Route as RouteIcon,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/data/rotas";
import { ROTA_COLUMNS, type RotaRow } from "@/lib/rotasMap";
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

const statusOpcoes = ["pendente", "confirmado", "concluido", "cancelado"] as const;

const STATUS_META: Record<
  (typeof statusOpcoes)[number],
  { label: string; badgeClass: string; barClass: string }
> = {
  pendente: {
    label: "Pendente",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    barClass: "bg-amber-500",
  },
  confirmado: {
    label: "Confirmado",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    barClass: "bg-blue-500",
  },
  concluido: {
    label: "Concluído",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    barClass: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    badgeClass: "border-red-500/30 bg-red-500/10 text-red-400",
    barClass: "bg-red-500",
  },
};

function contarStatus(lista: { status: string }[]) {
  return statusOpcoes.reduce<Record<string, number>>((acc, s) => {
    acc[s] = lista.filter((a) => a.status === s).length;
    return acc;
  }, {});
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as (typeof statusOpcoes)[number]];
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        meta?.badgeClass ?? "border-border bg-muted text-muted-foreground",
      )}
    >
      {meta?.label ?? status}
    </Badge>
  );
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
  { id: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
  { id: "conteudo", label: "Conteúdo do site", icon: FileText },
  { id: "usuarios", label: "Usuários e acessos", icon: Users },
] as const;

function AdminPage() {
  const { user, isAdmin, carregando } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<(typeof abas)[number]["id"]>("geral");

  useEffect(() => {
    if (!carregando && !isAdmin) {
      toast.error("Área restrita ao administrador.");
      void navigate({ to: "/minhas-viagens", replace: true });
    }
  }, [carregando, isAdmin, navigate]);

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

        <Tabs
          value={aba}
          onValueChange={(v) => setAba(v as (typeof abas)[number]["id"])}
          className="mt-6"
        >
          {/* Abas roláveis na horizontal em telas estreitas (celular/tablet retrato) */}
          <div className="-mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex h-auto w-max justify-start gap-1 bg-secondary/60 p-1">
              {abas.map(({ id, label, icon: Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className="min-h-11 shrink-0 gap-1.5 whitespace-nowrap px-3 text-sm"
                >
                  <Icon className="size-4 shrink-0" /> {label}
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
          <TabsContent value="agendamentos" className="mt-6">
            <AdminAgendamentos />
          </TabsContent>
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: rotas, isLoading: carregandoRotas } = useQuery({
    queryKey: ["admin-rotas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rotas")
        .select(ROTA_COLUMNS)
        .order("popularidade", { ascending: false });
      if (error) throw error;
      return data as unknown as RotaRow[];
    },
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

  return (
    <div className="space-y-8">
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
      const { error } = await supabase.from("rotas").insert({
        slug: slugAtual || `rota-${Date.now()}`,
        origem: form.origem,
        destino: form.destino,
        duracao: form.duracao,
        distancia: form.distancia,
        preco_pequeno: Number(form.preco_pequeno) || 0,
        resumo: form.resumo,
        ativo: false,
      });
      if (error) throw error;
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rotas")
        .select(ROTA_COLUMNS)
        .order("popularidade", { ascending: false });
      if (error) throw error;
      return data as unknown as RotaRow[];
    },
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
      const { error } = await supabase
        .from("rotas")
        .update({
          origem: form.origem,
          destino: form.destino,
          duracao: form.duracao,
          distancia: form.distancia,
          preco_pequeno: Number(form.preco_pequeno) || 0,
          preco_grande: form.preco_grande === null ? null : Number(form.preco_grande),
          preco_pequeno_noite:
            form.preco_pequeno_noite === null ? null : Number(form.preco_pequeno_noite),
          preco_grande_noite:
            form.preco_grande_noite === null ? null : Number(form.preco_grande_noite),
          destaque: form.destaque || null,
          resumo: form.resumo,
          descricao: form.descricao,
          foto: form.foto,
          galeria: form.galeria,
          ativo: form.ativo,
        })
        .eq("id", rota.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rota atualizada.");
      void queryClient.invalidateQueries({ queryKey: ["admin-rotas"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const remover = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rotas").delete().eq("id", rota.id);
      if (error) throw error;
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
      const caminho = `${rota.slug}/${Date.now()}-${arquivo.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("rotas").upload(caminho, arquivo);
      if (error) throw error;
      const { data, error: erroUrl } = await supabase.storage
        .from("rotas")
        .createSignedUrl(caminho, 60 * 60 * 24 * 365 * 20);
      if (erroUrl || !data) throw erroUrl ?? new Error("Falha ao gerar link da imagem.");
      setForm((f) =>
        destino === "principal"
          ? { ...f, foto: data.signedUrl, galeria: [data.signedUrl, ...f.galeria] }
          : { ...f, galeria: [...f.galeria, data.signedUrl] },
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

function AdminAgendamentos() {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | (typeof statusOpcoes)[number]>(
    "todos",
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin-agendamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("agendamentos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-agendamentos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar."),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agendamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento removido.");
      void queryClient.invalidateQueries({ queryKey: ["admin-agendamentos"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover."),
  });

  const lista = useMemo(() => data ?? [], [data]);
  const contagem = contarStatus(lista);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return lista.filter((a) => {
      if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
      if (!termo) return true;
      return `${a.trecho} ${a.contato_nome ?? ""} ${a.contato_telefone ?? ""}`
        .toLowerCase()
        .includes(termo);
    });
  }, [lista, busca, filtroStatus]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
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
                    {a.observacoes ? <p className="mt-2 text-sm">{a.observacoes}</p> : null}
                  </div>

                  <div className="flex items-center gap-2 border-t border-border pt-4 lg:border-0 lg:pt-0">
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conteudo_site")
        .select("id, chave, secao, titulo, texto, imagem, ordem")
        .order("secao", { ascending: true })
        .order("ordem", { ascending: true });
      if (error) throw error;
      return data as unknown as ConteudoItem[];
    },
  });

  const criar = useMutation({
    mutationFn: async (chave: string) => {
      const { error } = await supabase.from("conteudo_site").insert({ chave, secao: "geral" });
      if (error) throw error;
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
      const { error } = await supabase
        .from("conteudo_site")
        .update({
          secao: form.secao,
          titulo: form.titulo,
          texto: form.texto,
          imagem: form.imagem,
          ordem: Number(form.ordem) || 0,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conteúdo atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["admin-conteudo"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const remover = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("conteudo_site").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bloco removido.");
      void queryClient.invalidateQueries({ queryKey: ["admin-conteudo"] });
    },
  });

  async function enviarImagem(arquivo: File) {
    setEnviando(true);
    try {
      const caminho = `conteudo/${item.chave}/${Date.now()}-${arquivo.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("rotas").upload(caminho, arquivo);
      if (error) throw error;
      const { data, error: erroUrl } = await supabase.storage
        .from("rotas")
        .createSignedUrl(caminho, 60 * 60 * 24 * 365 * 20);
      if (erroUrl || !data) throw erroUrl ?? new Error("Falha ao gerar link da imagem.");
      setForm((f) => ({ ...f, imagem: data.signedUrl }));
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

  const senha = useMutation({
    mutationFn: (vars: { userId: string; senha: string }) => redefinirSenha({ data: vars }),
    onSuccess: () => toast.success("Senha redefinida."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao redefinir a senha."),
  });

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const todos = data ?? [];
    if (!termo) return todos;
    return todos.filter((u) =>
      [u.email, u.nome, u.telefone].some((c) => c.toLowerCase().includes(termo)),
    );
  }, [data, busca]);

  const totalAdmins = (data ?? []).filter((u) => u.isAdmin).length;

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando usuários…</p>;
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

      <div className="space-y-3">
        {lista.map((u) => (
          <UsuarioLinha
            key={u.id}
            usuario={u}
            euMesmo={u.id === user?.id}
            salvandoPapel={papel.isPending}
            salvandoSenha={senha.isPending}
            onAlternarAdmin={() => papel.mutate({ userId: u.id, admin: !u.isAdmin })}
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
  salvandoSenha,
  onAlternarAdmin,
  onRedefinirSenha,
}: {
  usuario: UsuarioAdmin;
  euMesmo: boolean;
  salvandoPapel: boolean;
  salvandoSenha: boolean;
  onAlternarAdmin: () => void;
  onRedefinirSenha: (senha: string) => void;
}) {
  const [novaSenha, setNovaSenha] = useState("");
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
          <Button
            variant={usuario.isAdmin ? "outline" : "secondary"}
            className="h-11"
            disabled={salvandoPapel || (euMesmo && usuario.isAdmin)}
            onClick={onAlternarAdmin}
          >
            {usuario.isAdmin ? "Remover admin" : "Tornar admin"}
          </Button>
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
            placeholder="mínimo 6 caracteres"
            className="mt-1 h-11 w-full sm:w-56"
          />
        </div>
        <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
          <Button
            variant="secondary"
            className="h-11"
            disabled={novaSenha.length < 6 || salvandoSenha}
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
