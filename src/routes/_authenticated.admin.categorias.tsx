import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { atualizarCategoria, criarCategoria, listarCategorias } from "@/lib/dados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Row = { id: string; nome: string; capacidade_passageiros: number | null; ativo: boolean };

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  ssr: false,
  component: CategoriasPage,
});

function CategoriasPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);
  const [form, setForm] = useState({ nome: "", capacidade_passageiros: "" });

  async function load() {
    setLoading(true);
    try {
      setRows(await listarCategorias());
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEdit(null); setForm({ nome: "", capacidade_passageiros: "" }); setOpen(true); }
  function openEdit(r: Row) { setEdit(r); setForm({ nome: r.nome, capacidade_passageiros: r.capacidade_passageiros ? String(r.capacidade_passageiros) : "" }); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { nome: form.nome, capacidade_passageiros: form.capacidade_passageiros ? Number(form.capacidade_passageiros) : null };
    try {
      if (edit) await atualizarCategoria(edit.id, payload);
      else await criarCategoria(payload.nome, payload.capacidade_passageiros);
      toast.success(edit ? "Categoria atualizada." : "Categoria criada.");
      setOpen(false); load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }
  async function toggle(r: Row) {
    try {
      await atualizarCategoria(r.id, { ativo: !r.ativo });
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorias de veículo</h1>
          <p className="text-sm text-muted-foreground">Sedan, SUV, Van, etc.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openNew}>Nova categoria</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{edit ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div><Label>Capacidade (pax)</Label><Input type="number" min={1} value={form.capacidade_passageiros} onChange={(e) => setForm({ ...form, capacidade_passageiros: e.target.value })} /></div>
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
            <TableHead>Nome</TableHead><TableHead>Capacidade</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Nenhuma categoria cadastrada.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell>{r.capacidade_passageiros ?? "—"}</TableCell>
                  <TableCell>{r.ativo ? "Ativa" : "Inativa"}</TableCell>
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