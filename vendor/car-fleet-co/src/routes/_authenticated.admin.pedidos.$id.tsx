import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listarFornecedoresAtivos, pedidoDetalheAdmin, salvarNotasInternas } from "@/lib/dados";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { STATUS_LABEL, StatusBadge, atribuirMotorista, formatDateTime, transicionarStatus, transicoesPermitidas, type PedidoStatus } from "@/lib/pedidos";
import { gerarVoucherPDF } from "@/lib/voucher";

export const Route = createFileRoute("/_authenticated/admin/pedidos/$id")({
  ssr: false,
  component: PedidoDetalhe,
});

type Fornecedor = { id: string; nome: string; cidade_atuacao: string };
type Historico = { id: string; status_anterior: PedidoStatus | null; status_novo: PedidoStatus; created_at: string };

function PedidoDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [p, setP] = useState<any | null>(null);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [novoFornecedor, setNovoFornecedor] = useState<string>("");
  const [novoStatus, setNovoStatus] = useState<string>("");
  const [obs, setObs] = useState("");

  async function load() {
    let data: any;
    try {
      data = await pedidoDetalheAdmin(Number(id));
    } catch (e: any) {
      return toast.error(e?.message ?? "Erro ao carregar pedido");
    }
    if (!data) { toast.error("Pedido não encontrado"); return; }
    setP(data);
    setObs(data.observacoes_internas ?? "");
    setNovoFornecedor(data.fornecedor_id ?? "");
    setHistorico(data.historico ?? []);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (!p) return;
    listarFornecedoresAtivos().then(setFornecedores);
  }, [p]);

  if (!p) return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;

  const sugestoes = fornecedores.filter(f => f.cidade_atuacao?.toLowerCase() === p.cidade_atendimento?.toLowerCase());
  const outros = fornecedores.filter(f => !sugestoes.includes(f));
  const transicoes = transicoesPermitidas(p.status as PedidoStatus, "admin");

  async function salvarObs() {
    try {
      await salvarNotasInternas(p.id, obs);
      toast.success("Observações salvas."); load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }
  async function atribuir() {
    if (!novoFornecedor) return;
    try { await atribuirMotorista(p.id, novoFornecedor); toast.success("Motorista atribuído."); load(); }
    catch (e: any) { toast.error(e.message); }
  }
  async function mudarStatus() {
    if (!novoStatus) return;
    try { await transicionarStatus(p.id, novoStatus as PedidoStatus); toast.success("Status atualizado."); setNovoStatus(""); load(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground"><Link to="/admin/pedidos" className="underline">Pedidos</Link> / #{p.id}</div>
          <h1 className="text-2xl font-semibold">Pedido #{p.id} <StatusBadge status={p.status} /></h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => gerarVoucherPDF({ ...p, empresa: p.empresas_clientes?.nome, canal: p.canais_venda?.nome, categoria: p.categorias_veiculo?.nome, fornecedor: p.fornecedores?.nome }, true)}>Imprimir voucher</Button>
          <Button onClick={() => gerarVoucherPDF({ ...p, empresa: p.empresas_clientes?.nome, canal: p.canais_venda?.nome, categoria: p.categorias_veiculo?.nome, fornecedor: p.fornecedores?.nome })}>PDF voucher</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Dados da corrida</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Código canal" v={p.codigo_reserva_canal} />
            <Info label="Código fornecedor" v={p.codigo_fornecedor_reserva} />
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
            <Info label="Empresa" v={p.empresas_clientes?.nome} />
            <Info label="Canal" v={p.canais_venda?.nome} />
            <Info label="Emitido em" v={formatDateTime(p.data_emissao)} />
            <Info label="Alterado em" v={formatDateTime(p.data_alteracao)} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Motorista</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Atual: <strong>{p.fornecedores?.nome ?? "— nenhum —"}</strong></div>
              <Label>Atribuir / reatribuir</Label>
              <Select value={novoFornecedor} onValueChange={setNovoFornecedor}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {sugestoes.length > 0 && <div className="px-2 py-1 text-xs text-muted-foreground">Cidade {p.cidade_atendimento}</div>}
                  {sugestoes.map(f => <SelectItem key={f.id} value={f.id}>{f.nome} · {f.cidade_atuacao}</SelectItem>)}
                  {outros.length > 0 && <div className="px-2 py-1 text-xs text-muted-foreground">Outros</div>}
                  {outros.map(f => <SelectItem key={f.id} value={f.id}>{f.nome} · {f.cidade_atuacao}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={atribuir} disabled={!novoFornecedor}>Atribuir</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Alterar status</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {transicoes.length === 0 ? <div className="text-muted-foreground">Nenhuma transição disponível a partir de <em>{STATUS_LABEL[p.status as PedidoStatus]}</em>.</div>
              : <>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger><SelectValue placeholder="Novo status" /></SelectTrigger>
                  <SelectContent>{transicoes.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" onClick={mudarStatus} disabled={!novoStatus}>Aplicar</Button>
              </>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Observações internas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
              <div className="text-xs text-muted-foreground">Obs. do motorista: {p.observacao_motorista ?? "—"}</div>
              <Button size="sm" onClick={salvarObs}>Salvar</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Histórico de status</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {historico.length === 0 ? <div className="text-muted-foreground">Sem alterações registradas.</div>
          : <ul className="space-y-1">{historico.map(h => (
            <li key={h.id} className="flex gap-2 text-xs">
              <span className="text-muted-foreground">{formatDateTime(h.created_at)}</span>
              <span>{h.status_anterior ? STATUS_LABEL[h.status_anterior] : "—"} → {STATUS_LABEL[h.status_novo]}</span>
            </li>
          ))}</ul>}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, v }: { label: string; v: any }) {
  return (<div><div className="text-xs text-muted-foreground">{label}</div><div>{v ?? "—"}</div></div>);
}