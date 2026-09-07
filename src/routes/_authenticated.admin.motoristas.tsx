import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { criarNovoMotorista, listarFornecedores, removerCadastroMotorista } from "@/lib/dados";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Fornecedor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade_atuacao: string;
  ativo: boolean;
};

export const Route = createFileRoute("/_authenticated/admin/motoristas")({
  ssr: false,
  component: MotoristasPage,
});

function MotoristasPage() {
  const [rows, setRows] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: "", email: "", senha: "", telefone: "", cidade_atuacao: "", regiao_atuacao: "", observacoes_internas: "",
  });
  const [busy, setBusy] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await listarFornecedores());
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await criarNovoMotorista(form);
      toast.success("Motorista criado.");
      setOpen(false);
      setForm({ nome: "", email: "", senha: "", telefone: "", cidade_atuacao: "", regiao_atuacao: "", observacoes_internas: "" });
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function remover(f: Fornecedor) {
    if (!confirm(`Remover o acesso do motorista "${f.nome}"? Se ele tiver pedidos, o cadastro será desativado e o login revogado.`)) return;
    setRemovendo(f.id);
    try {
      const res = await removerCadastroMotorista(f.id);
      toast.success(res.removido ? "Motorista removido." : "Motorista desativado e login revogado.");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Motoristas</h1>
          <p className="text-sm text-muted-foreground">Fornecedores parceiros com acesso ao portal.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>Novo motorista</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo motorista</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <Field label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} required />
              <Field label="E-mail (login)" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
              <Field label="Senha (mín. 8)" type="password" value={form.senha} onChange={(v) => setForm({ ...form, senha: v })} required minLength={8} />
              <Field label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />
              <Field label="Cidade de atuação" value={form.cidade_atuacao} onChange={(v) => setForm({ ...form, cidade_atuacao: v })} required />
              <Field label="Região (opcional)" value={form.regiao_atuacao} onChange={(v) => setForm({ ...form, regiao_atuacao: v })} />
              <Field label="Observações internas" value={form.observacoes_internas} onChange={(v) => setForm({ ...form, observacoes_internas: v })} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={busy}>{busy ? "Criando…" : "Criar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhum motorista cadastrado ainda.</TableCell></TableRow>
            ) : rows.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.nome}</TableCell>
                <TableCell>{f.email ?? "—"}</TableCell>
                <TableCell>{f.telefone ?? "—"}</TableCell>
                <TableCell>{f.cidade_atuacao}</TableCell>
                <TableCell>{f.ativo ? "Ativo" : "Inativo"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" disabled={removendo === f.id} onClick={() => remover(f)}>
                    {removendo === f.id ? "…" : "Remover"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, minLength }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; minLength?: number;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} minLength={minLength} />
    </div>
  );
}