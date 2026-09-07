import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listarCanais, listarPedidosMotorista } from "@/lib/dados";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { STATUS_LABEL, STATUS_OPTIONS, StatusBadge, formatDateTime, type PedidoDirecao, type PedidoStatus } from "@/lib/pedidos";

type Row = {
  id: number; codigo_reserva_canal: string | null; cidade_atendimento: string; hotel: string | null;
  data_hora_encontro: string; direcao: PedidoDirecao; status: PedidoStatus; passageiro_nome: string;
  canais_venda: { nome: string } | null; empresa_nome: string | null;
};

export const Route = createFileRoute("/_authenticated/motorista/pedidos")({
  ssr: false,
  component: PesquisarPage,
});

function PesquisarPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [canais, setCanais] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({
    codigo: "", canal: "any", tipoData: "atividade" as "atividade" | "emissao" | "alteracao",
    de: "", ate: "", status: "any", direcao: "any", passageiro: "", cidade: "",
  });

  useEffect(() => {
    listarCanais(true).then(setCanais as any);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await listarPedidosMotorista({
        codigo: f.codigo || undefined,
        canal: f.canal !== "any" ? f.canal : undefined,
        status: f.status !== "any" ? (f.status as PedidoStatus) : undefined,
        direcao: f.direcao !== "any" ? (f.direcao as PedidoDirecao) : undefined,
        passageiro: f.passageiro || undefined,
        cidade: f.cidade || undefined,
        tipoData: f.tipoData,
        de: f.de || undefined,
        ate: f.ate || undefined,
      });
      setRows(data as any);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-lg font-semibold">Pesquisar pedidos</h1>

      <div className="rounded border bg-background p-3 grid grid-cols-2 gap-2 text-sm">
        <F label="Código"><Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} /></F>
        <F label="Passageiro"><Input value={f.passageiro} onChange={(e) => setF({ ...f, passageiro: e.target.value })} /></F>
        <F label="Cidade"><Input value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></F>
        <F label="Direção">
          <Select value={f.direcao} onValueChange={(v) => setF({ ...f, direcao: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="any">Todas</SelectItem><SelectItem value="IN">IN</SelectItem><SelectItem value="OUT">OUT</SelectItem></SelectContent>
          </Select>
        </F>
        <F label="Status">
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="any">Todos</SelectItem>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Canal">
          <Select value={f.canal} onValueChange={(v) => setF({ ...f, canal: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="any">Todos</SelectItem>{canais.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F label="Tipo de data">
          <Select value={f.tipoData} onValueChange={(v) => setF({ ...f, tipoData: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="atividade">Atividade</SelectItem><SelectItem value="emissao">Emissão</SelectItem><SelectItem value="alteracao">Alteração</SelectItem></SelectContent>
          </Select>
        </F>
        <F label="De"><Input type="date" value={f.de} onChange={(e) => setF({ ...f, de: e.target.value })} /></F>
        <F label="Até"><Input type="date" value={f.ate} onChange={(e) => setF({ ...f, ate: e.target.value })} /></F>
        <div className="col-span-2"><Button className="w-full" onClick={load} disabled={loading}>{loading ? "Buscando…" : "Filtrar"}</Button></div>
      </div>

      <ul className="space-y-2">
        {rows.length === 0 ? <li className="text-sm text-muted-foreground p-3 text-center">Nenhum pedido encontrado.</li>
          : rows.map((r) => (
            <li key={r.id} className="rounded border bg-background p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">#{r.id} · {formatDateTime(r.data_hora_encontro)} · {r.direcao}</div>
                <div className="text-sm font-medium truncate">{r.cidade_atendimento}{r.hotel ? ` · ${r.hotel}` : ""}</div>
                <div className="text-xs text-muted-foreground truncate">{r.passageiro_nome}</div>
                <div className="mt-1"><StatusBadge status={r.status} /></div>
              </div>
              <Link to="/motorista/pedidos/$id" params={{ id: String(r.id) }} className="rounded border px-3 py-1 text-sm hover:bg-accent">Ver</Link>
            </li>
          ))}
      </ul>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}