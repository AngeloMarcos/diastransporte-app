import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { atualizarCanal, criarCanal, listarCanais } from "@/lib/dados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Row = { id: string; nome: string; tipo: string; ativo: boolean };

export const Route = createFileRoute("/_authenticated/admin/canais")({
  ssr: false,
  component: CanaisPage,
});

function CanaisPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [form, setForm] = useState({ nome: "", tipo: "ota" });

  async function load() {
    setLoading(true);
    try {
      setRows(await listarCanais());
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEdit(null); setForm({ nome: "", tipo: "ota" }); setOpen(true); }
  function openEdit(r: Row) { setEdit(r); setForm({ nome: r.nome, tipo: r.tipo }); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (edit) await atualizarCanal(edit.id, form);
      else await criarCanal(form.nome, form.tipo);
      toast.success(edit ? "Canal atualizado." : "Canal criado.");
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }
  async function toggle(r: Row) {
    try {
      await atualizarCanal(r.id, { ativo: !r.ativo });
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Canais de venda</h1>
          <p className="text-sm text-muted-foreground">OTAs, agências e canais diretos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}>Novo canal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? "Editar canal" : "Novo canal"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ota">OTA</SelectItem>
                    <SelectItem value="agencia">Agência</SelectItem>
                    <SelectItem value="direto">Direto</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded border bg-background">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Nenhum canal cadastrado.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="capitalize">{r.tipo}</TableCell>
                  <TableCell>{r.ativo ? "Ativo" : "Inativo"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(r)}>{r.ativo ? "Inativar" : "Ativar"}</Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}