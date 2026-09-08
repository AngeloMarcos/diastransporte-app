// Voucher de transfer em PDF — gerado 100% no navegador (jsPDF), nada sobe
// pro servidor. Portado do car-fleet-co quase sem mudança, só trocando os
// helpers de label/data pelos equivalentes deste app
// (pedidos-status.ts::PEDIDO_STATUS_META/formatarDataHora). Import sempre
// dinâmico (`await import("jspdf")`) em quem chama isto — jsPDF só é
// carregado quando alguém realmente pede o voucher, não no bundle principal
// do admin.
import { PEDIDO_STATUS_META, formatarDataHora } from "@/lib/pedidos-status";
import type { PedidoStatus } from "@/lib/pedidos-transicoes";

export type VoucherData = {
  id: number;
  codigo_reserva_canal: string | null;
  codigo_fornecedor_reserva: string | null;
  passageiro_nome: string;
  passageiro_telefone: string | null;
  cidade_atendimento: string;
  hotel: string | null;
  direcao: "IN" | "OUT";
  data_hora_encontro: string;
  ponto_partida: string | null;
  ponto_chegada: string | null;
  numero_voo: string | null;
  status: PedidoStatus;
  observacao_motorista?: string | null;
  empresa?: string | null;
  canal?: string | null;
  categoria?: string | null;
  fornecedor?: string | null;
};

export async function gerarVoucherPDF(v: VoucherData, autoprint = false): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFontSize(16).setFont("helvetica", "bold");
  doc.text("Voucher de Transfer", 40, y);
  y += 8;
  doc.setDrawColor(200);
  doc.line(40, y, largura - 40, y);
  y += 20;

  doc.setFontSize(11).setFont("helvetica", "normal");
  const linhas: [string, string][] = [
    ["Corrida #", String(v.id)],
    ["Código canal", v.codigo_reserva_canal ?? "—"],
    ["Código fornecedor", v.codigo_fornecedor_reserva ?? "—"],
    ["Passageiro", v.passageiro_nome],
    ["Telefone", v.passageiro_telefone ?? "—"],
    ["Cidade", v.cidade_atendimento],
    ["Hotel", v.hotel ?? "—"],
    ["Direção", v.direcao === "IN" ? "IN (chegada)" : "OUT (saída)"],
    ["Encontro", formatarDataHora(v.data_hora_encontro)],
    ["Partida", v.ponto_partida ?? "—"],
    ["Chegada", v.ponto_chegada ?? "—"],
    ["Voo", v.numero_voo ?? "—"],
    ["Empresa", v.empresa ?? "—"],
    ["Canal", v.canal ?? "—"],
    ["Categoria", v.categoria ?? "—"],
    ["Motorista", v.fornecedor ?? "—"],
    ["Status", PEDIDO_STATUS_META[v.status].label],
  ];
  for (const [k, val] of linhas) {
    doc.setFont("helvetica", "bold").text(`${k}:`, 40, y);
    doc.setFont("helvetica", "normal");
    const texto = doc.splitTextToSize(val, largura - 200) as string[];
    doc.text(texto, 180, y);
    y += 16 * Math.max(1, texto.length);
    if (y > 780) {
      doc.addPage();
      y = 40;
    }
  }

  if (v.observacao_motorista) {
    y += 8;
    doc.setFont("helvetica", "bold").text("Observação do motorista:", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    const texto = doc.splitTextToSize(v.observacao_motorista, largura - 80) as string[];
    doc.text(texto, 40, y);
  }

  if (autoprint) doc.autoPrint();
  const url = doc.output("bloburl");
  window.open(url as unknown as string, "_blank");
}
