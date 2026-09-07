import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { importarPedidos, verificarCodigosExistentes } from "@/lib/dados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { PedidoDirecao } from "@/lib/pedidos";

type Lookup = { id: string; nome: string };

type ParsedRow = {
  ok: boolean;
  error?: string;
  duplicate?: boolean;
  codigo_reserva_canal: string | null;
  codigo_fornecedor_reserva: string | null;
  passageiro_nome: string;
  passageiro_telefone: string | null;
  cidade_atendimento: string;
  hotel: string | null;
  data_hora_encontro: string; // ISO
  data_hora_display: string;
  direcao: PedidoDirecao;
  numero_voo: string | null;
  ponto_partida: string | null;
  ponto_chegada: string | null;
  empresa_cliente_id: string | null;
  canal_venda_id: string | null;
  categoria_veiculo_id: string | null;
  _canal_nome?: string;
  _categoria_nome?: string;
};

function stripPrefix(v: unknown, prefix: RegExp) {
  if (!v) return null;
  const s = String(v).trim().replace(prefix, "").replace(/\.\s*$/, "").trim();
  return s || null;
}

function firstCity(v: unknown) {
  if (!v) return "";
  const s = String(v).trim();
  const first = s.split(">")[0].trim();
  // "SLZ - Aeroporto ..." => keep after " - "
  const dash = first.split(" - ");
  return (dash.length > 1 ? dash.slice(1).join(" - ") : first).trim();
}

function parseBrDate(v: unknown): { iso: string; display: string } | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime()))
    return { iso: v.toISOString(), display: v.toLocaleString("pt-BR") };
  const s = String(v).trim();
  // dd/mm/yyyy HH:MM  (also aceita sem hora)
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [_, dd, mm, yyyy, hh = "00", mi = "00"] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00`);
  if (isNaN(d.getTime())) return null;
  return { iso: d.toISOString(), display: d.toLocaleString("pt-BR") };
}

function matchLookup(nome: string | null | undefined, list: Lookup[]) {
  if (!nome) return null;
  const n = nome.trim().toLowerCase();
  return list.find((x) => x.nome.trim().toLowerCase() === n)?.id ?? null;
}

export function ImportPedidosDialog({
  canais, categorias, onDone,
}: {
  empresas?: Lookup[]; canais: Lookup[]; categorias: Lookup[]; onDone: () => void;
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  const validCount = useMemo(() => rows.filter((r, i) => r.ok && !r.duplicate && selected[i]).length, [rows, selected]);

  async function handleFile(file: File) {
    setParsing(true); setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      // pegar códigos existentes para marcar duplicados
      const codigos = raw.map((r) => String(r["Nº Pedido"] ?? "").trim()).filter(Boolean);
      const existentes = codigos.length ? await verificarCodigosExistentes(codigos) : [];
      const existing = new Set(existentes);

      const parsed: ParsedRow[] = raw.map((r) => {
        const tipo = String(r["Tipo Serviço"] ?? "").toUpperCase();
        const direcao: PedidoDirecao = tipo.includes("OUT") ? "OUT" : "IN";
        const isIN = direcao === "IN";
        const hotel = isIN
          ? stripPrefix(r["Hotel In"], /^\s*in:\s*/i) ?? stripPrefix(r["Hotel Out"], /^\s*out:\s*/i)
          : stripPrefix(r["Hotel Out"], /^\s*out:\s*/i) ?? stripPrefix(r["Hotel In"], /^\s*in:\s*/i);
        const voo = isIN
          ? stripPrefix(r["Voo In"], /^\s*in:\s*/i) ?? stripPrefix(r["Voo Out"], /^\s*out:\s*/i)
          : stripPrefix(r["Voo Out"], /^\s*out:\s*/i) ?? stripPrefix(r["Voo In"], /^\s*in:\s*/i);
        const dataFonte = isIN
          ? (r["Data Voo In"] || r["Data Atividade"])
          : (r["Data Voo Out"] || r["Data Atividade"]);
        const dt = parseBrDate(dataFonte) ?? parseBrDate(r["Data Atividade"]);
        const passageiro = String(r["Pax"] ?? "").trim();
        const cidade = firstCity(r["Cidade"] ?? (isIN ? r["Destino"] : r["Origem"]));
        const codigo = String(r["Nº Pedido"] ?? "").trim() || null;
        const canalNome = String(r["Empresa"] ?? "").trim() || undefined;
        const catNome = String(r["Categoria"] ?? "").trim() || undefined;

        const errors: string[] = [];
        if (!passageiro) errors.push("Pax vazio");
        if (!cidade) errors.push("Cidade vazia");
        if (!dt) errors.push("Data inválida");

        return {
          ok: errors.length === 0,
          error: errors.join(", ") || undefined,
          duplicate: codigo ? existing.has(codigo) : false,
          codigo_reserva_canal: codigo,
          codigo_fornecedor_reserva: String(r["Pedido Fornecedor"] ?? "").trim() || null,
          passageiro_nome: passageiro,
          passageiro_telefone: String(r["Telefone Pax"] ?? "").trim() || null,
          cidade_atendimento: cidade,
          hotel,
          data_hora_encontro: dt?.iso ?? "",
          data_hora_display: dt?.display ?? "—",
          direcao,
          numero_voo: voo,
          ponto_partida: String(r["Origem"] ?? "").trim() || null,
          ponto_chegada: String(r["Destino"] ?? "").trim() || null,
          empresa_cliente_id: null,
          canal_venda_id: matchLookup(canalNome, canais),
          categoria_veiculo_id: matchLookup(catNome, categorias),
          _canal_nome: canalNome,
          _categoria_nome: catNome,
        };
      });

      setRows(parsed);
      setSelected(parsed.map((r) => r.ok && !r.duplicate));
    } catch (e: any) {
      toast.error("Falha ao ler planilha: " + (e?.message ?? e));
    } finally { setParsing(false); }
  }

  async function importar() {
    const payload = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r, i }) => r.ok && !r.duplicate && selected[i])
      .map(({ r }) => ({
        codigo_reserva_canal: r.codigo_reserva_canal,
        codigo_fornecedor_reserva: r.codigo_fornecedor_reserva,
        passageiro_nome: r.passageiro_nome,
        passageiro_telefone: r.passageiro_telefone,
        cidade_atendimento: r.cidade_atendimento,
        hotel: r.hotel,
        data_hora_encontro: r.data_hora_encontro,
        direcao: r.direcao,
        numero_voo: r.numero_voo,
        ponto_partida: r.ponto_partida,
        ponto_chegada: r.ponto_chegada,
        canal_venda_id: r.canal_venda_id,
        categoria_veiculo_id: r.categoria_veiculo_id,
      }));

    if (payload.length === 0) return toast.error("Nenhuma linha válida selecionada.");
    setImporting(true);
    try {
      const res = await importarPedidos(payload as any);
      toast.success(
        `${res.inseridos} pedidos importados${res.ignorados > 0 ? ` • ${res.ignorados} ignorados (duplicados)` : ""}.`,
      );
      onDone();
    } catch (e: any) {
      toast.error("Falha na importação: " + (e?.message ?? e));
    } finally {
      setImporting(false);
    }
  }

  const totalOk = rows.filter((r) => r.ok && !r.duplicate).length;
  const totalDup = rows.filter((r) => r.duplicate).length;
  const totalErr = rows.filter((r) => !r.ok).length;

  return (
    <DialogContent className="max-w-6xl">
      <DialogHeader><DialogTitle>Importar pedidos (planilha)</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Label className="text-xs">Arquivo .xlsx ou .csv (formato Sou Motorista)</Label>
            <Input type="file" accept=".xlsx,.xls,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {fileName && <p className="text-xs text-muted-foreground mt-1">{fileName}</p>}
          </div>
          {rows.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {totalOk} válidos • {totalDup} duplicados • {totalErr} com erro
            </div>
          )}
        </div>

        {parsing && <p className="text-sm text-muted-foreground">Lendo planilha…</p>}

        {rows.length > 0 && (
          <div className="max-h-[55vh] overflow-auto rounded border">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Dir.</TableHead>
                <TableHead>Passageiro</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Hotel</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} className={!r.ok ? "opacity-60" : r.duplicate ? "opacity-70" : ""}>
                    <TableCell>
                      <Checkbox checked={selected[i] ?? false}
                        disabled={!r.ok || r.duplicate}
                        onCheckedChange={(v) => {
                          const s = [...selected]; s[i] = !!v; setSelected(s);
                        }} />
                    </TableCell>
                    <TableCell className="text-xs">{r.codigo_reserva_canal ?? "—"}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{r.data_hora_display}</TableCell>
                    <TableCell className="text-xs">{r.direcao}</TableCell>
                    <TableCell className="text-xs max-w-40 truncate">{r.passageiro_nome || "—"}</TableCell>
                    <TableCell className="text-xs">{r.cidade_atendimento || "—"}</TableCell>
                    <TableCell className="text-xs max-w-40 truncate">{r.hotel ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.canal_venda_id ? <span>{r._canal_nome}</span>
                        : r._canal_nome ? <span className="text-amber-600">{r._canal_nome} (não vinculado)</span>
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.categoria_veiculo_id ? <span>{r._categoria_nome}</span>
                        : r._categoria_nome ? <span className="text-amber-600">{r._categoria_nome} (não vinculada)</span>
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {!r.ok ? <span className="text-red-600">{r.error}</span>
                        : r.duplicate ? <span className="text-amber-600">Já existe</span>
                        : <span className="text-emerald-600">OK</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Canais/categorias que não correspondem a cadastros existentes ficam em branco no pedido — você pode vinculá-los depois. Empresa cliente não é preenchida automaticamente.
        </p>
      </div>
      <DialogFooter>
        <Button onClick={importar} disabled={importing || validCount === 0}>
          {importing ? "Importando…" : `Importar ${validCount} pedidos`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
