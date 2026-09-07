import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { pedidoDetalheMotorista, salvarObservacaoMotorista } from "@/lib/dados";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { STATUS_LABEL, StatusBadge, formatDateTime, transicionarStatus, transicoesPermitidas, type PedidoStatus } from "@/lib/pedidos";
import { gerarVoucherPDF } from "@/lib/voucher";

export const Route = createFileRoute("/_authenticated/motorista/pedidos/$id")({
  ssr: false,
  component: PedidoDetalhe,
});

function PedidoDetalhe() {
  const { id } = Route.useParams();
  const [p, setP] = useState<any | null>(null);
  const [obs, setObs] = useState("");

  async function load() {
    let data: any;
    try {
      data = await pedidoDetalheMotorista(Number(id));
    } catch (e: any) {
      return toast.error(e?.message ?? "Erro ao carregar pedido");
    }
    if (!data) return toast.error("Pedido não encontrado ou sem acesso");
    setP(data); setObs(data.observacao_motorista ?? "");
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!p) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  const transicoes = transicoesPermitidas(p.status as PedidoStatus, "motorista");
  const proximoAcao = transicoes[0]; // ex: aceita_motorista, em_atendimento, corrida_finalizada

  async function salvarObs() {
    try {
      await salvarObservacaoMotorista(p.id, obs);
      toast.success("Observação salva.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }
  async function aplicar(s: PedidoStatus) {
    try { await transicionarStatus(p.id, s); toast.success("Status atualizado."); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  const voucher = { ...p, empresa: p.empresa_nome, canal: p.canais_venda?.nome, categoria: p.categorias_veiculo?.nome, fornecedor: p.fornecedores?.nome };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <div className="text-xs text-muted-foreground"><Link to="/motorista" className="underline">Início</Link> / #{p.id}</div>
        <h1 className="text-lg font-semibold">Pedido #{p.id}</h1>
        <div className="mt-1"><StatusBadge status={p.status} /></div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Corrida</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Passageiro" v={p.passageiro_nome} />
          <Info label="Telefone" v={p.passageiro_telefone} />
          <Info label="Cidade" v={p.cidade_atendimento} />
          <Info label="Hotel" v={p.hotel} />
          <Info label="Direção" v={p.direcao} />
          <Info label="Encontro" v={formatDateTime(p.data_hora_encontro)} />
          <Info label="Partida" v={p.ponto_partida} />
          <Info label="Chegada" v={p.ponto_chegada} />
          <Info label="Voo" v={p.numero_voo} />
          <Info label="Categoria" v={p.categorias_veiculo?.nome} />
          <Info label="Código canal" v={p.codigo_reserva_canal} />
          <Info label="Empresa" v={p.empresa_nome} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Ações</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {transicoes.length === 0 ? <div className="text-muted-foreground">Nada a fazer no status atual.</div>
          : <div className="flex flex-wrap gap-2">
              {proximoAcao && <Button size="sm" onClick={() => aplicar(proximoAcao)}>{STATUS_LABEL[proximoAcao]}</Button>}
              {transicoes.slice(1).map(s => <Button key={s} size="sm" variant="outline" onClick={() => aplicar(s)}>{STATUS_LABEL[s]}</Button>)}
            </div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Minha observação</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: passageiro atrasou 15 min, hotel mudou…" />
          <Button size="sm" onClick={salvarObs}>Salvar</Button>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => gerarVoucherPDF(voucher, true)}>Imprimir voucher</Button>
        <Button className="flex-1" onClick={() => gerarVoucherPDF(voucher)}>PDF voucher</Button>
      </div>
    </div>
  );
}

function Info({ label, v }: { label: string; v: any }) {
  return (<div><div className="text-xs text-muted-foreground">{label}</div><div className="break-words">{v ?? "—"}</div></div>);
}