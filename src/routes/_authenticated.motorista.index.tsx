import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motoristaResumo } from "@/lib/dados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, formatDateTime, type PedidoStatus, type PedidoDirecao } from "@/lib/pedidos";

type Row = {
  id: number; cidade_atendimento: string; hotel: string | null;
  data_hora_encontro: string; direcao: PedidoDirecao; status: PedidoStatus;
};

export const Route = createFileRoute("/_authenticated/motorista/")({
  ssr: false,
  component: MotoristaHome,
});

function MotoristaHome() {
  const [hoje, setHoje] = useState<Row[]>([]);
  const [semana, setSemana] = useState<Row[]>([]);

  useEffect(() => {
    motoristaResumo().then(({ hoje, semana }) => {
      setHoje(hoje as Row[]); setSemana(semana as Row[]);
    });
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PedidoList titulo="Pedidos de hoje" rows={hoje} vazio="Nenhuma corrida para hoje." />
      <PedidoList titulo="Próximos 7 dias" rows={semana} vazio="Nada agendado para os próximos 7 dias." />
    </div>
  );
}

function PedidoList({ titulo, rows, vazio }: { titulo: string; rows: Row[]; vazio: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{titulo}</CardTitle></CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? <div className="p-4 text-sm text-muted-foreground">{vazio}</div>
          : <ul className="divide-y">{rows.map((r) => (
            <li key={r.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{formatDateTime(r.data_hora_encontro)} · {r.direcao}</div>
                <div className="text-sm font-medium truncate">{r.cidade_atendimento}{r.hotel ? ` · ${r.hotel}` : ""}</div>
                <div className="mt-1"><StatusBadge status={r.status} /></div>
              </div>
              <Link to="/motorista/pedidos/$id" params={{ id: String(r.id) }}
                className="rounded border px-3 py-1 text-sm hover:bg-accent">Ver</Link>
            </li>
          ))}</ul>}
      </CardContent>
    </Card>
  );
}