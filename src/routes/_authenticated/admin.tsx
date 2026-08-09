import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL } from "@/data/rotas";
import { ROTA_COLUMNS, type RotaRow } from "@/lib/rotasMap";

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

function AdminPage() {
  const { isAdmin, carregando } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState<"rotas" | "agendamentos">("rotas");

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
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="font-display text-3xl">Painel do administrador</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Edite fotos, descrições e preços das rotas e acompanhe os agendamentos.
        </p>

        <div className="mt-6 flex gap-2">
          <Button
            variant={aba === "rotas" ? "default" : "secondary"}
            size="sm"
            onClick={() => setAba("rotas")}
          >
            Rotas e preços
          </Button>
          <Button
            variant={aba === "agendamentos" ? "default" : "secondary"}
            size="sm"
            onClick={() => setAba("agendamentos")}
          >
            Agendamentos
          </Button>
        </div>

        {aba === "rotas" ? <AdminRotas /> : <AdminAgendamentos />}
      </main>
      <Footer />
    </div>
  );
}

function AdminRotas() {
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

  if (isLoading) return <p className="mt-8 text-sm text-muted-foreground">Carregando rotas…</p>;

  return (
    <div className="mt-8 space-y-4">
      {data?.map((rota) => (
        <RotaEditor key={rota.id} rota={rota} />
      ))}
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={form.foto} alt="" className="size-12 rounded-sm object-cover" />
          <div>
            <h2 className="font-display text-lg">
              {rota.origem} → {rota.destino}
            </h2>
            <p className="text-xs text-muted-foreground">
              {formatBRL(rota.preco_pequeno)} · {rota.ativo ? "ativa" : "oculta"}
            </p>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setAberto((v) => !v)}>
          {aberto ? "Fechar" : "Editar"}
        </Button>
      </div>

      {aberto && (
        <div className="mt-6 space-y-4 border-t border-border pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Input
                type="file"
                accept="image/*"
                className="max-w-xs"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  if (arquivo) void enviarFoto(arquivo, "principal");
                }}
              />
              <Input
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
                  <img src={url} alt="" className="size-16 rounded-sm object-cover" />
                  <button
                    type="button"
                    aria-label="Remover foto"
                    onClick={() =>
                      setForm((f) => ({ ...f, galeria: f.galeria.filter((_, idx) => idx !== i) }))
                    }
                    className="absolute -right-1 -top-1 rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <Input
              type="file"
              accept="image/*"
              className="mt-3 max-w-xs"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) void enviarFoto(arquivo, "galeria");
              }}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            />
            Rota visível no site
          </label>

          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending || enviandoFoto}>
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
      <Input className="mt-2" value={value} onChange={(e) => onChange(e.target.value)} />
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
        className="mt-2"
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
  });

  if (isLoading) return <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>;
  if (!data?.length)
    return <p className="mt-8 text-sm text-muted-foreground">Nenhum agendamento ainda.</p>;

  return (
    <div className="mt-8 space-y-4">
      {data.map((a) => (
        <article key={a.id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg">{a.trecho}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.data_viagem ?? "data a combinar"}
                {a.hora ? ` · ${a.hora}` : ""} · carro {a.carro} · {a.periodo} · {a.passageiros}{" "}
                passageiro(s)
                {a.valor ? ` · ${formatBRL(a.valor)}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.contato_nome ?? "sem nome"} · {a.contato_telefone ?? "sem telefone"}
              </p>
              {a.embarque_local ? (
                <p className="mt-1 text-xs text-muted-foreground">Embarque: {a.embarque_local}</p>
              ) : null}
              {a.observacoes ? <p className="mt-2 text-sm">{a.observacoes}</p> : null}
            </div>
            <div className="flex flex-wrap gap-1">
              {statusOpcoes.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={a.status === s ? "default" : "secondary"}
                  onClick={() => atualizar.mutate({ id: a.id, status: s })}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
