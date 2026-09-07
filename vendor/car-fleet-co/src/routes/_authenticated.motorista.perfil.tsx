import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { atualizarMeuPerfil, meuFornecedor, trocarMinhaSenha } from "@/lib/dados";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/motorista/perfil")({
  ssr: false,
  component: PerfilPage,
});

function PerfilPage() {
  const [me, setMe] = useState<{ email: string | null } | null>(null);
  const [f, setF] = useState<{ id: string; nome: string; telefone: string | null; cidade_atuacao: string } | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const fornecedor = await meuFornecedor();
      if (!fornecedor) return;
      setMe({ email: fornecedor.email });
      setF(fornecedor);
    })();
  }, []);

  async function salvarPerfil() {
    if (!f) return;
    const nome = f.nome.trim();
    const telefone = (f.telefone ?? "").trim();
    if (nome.length < 2 || nome.length > 200) return toast.error("Informe um nome entre 2 e 200 caracteres.");
    if (telefone.length > 120) return toast.error("Telefone muito longo.");
    try {
      await atualizarMeuPerfil(nome, telefone || null);
      toast.success("Perfil atualizado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }
  async function trocarSenha() {
    if (novaSenha.length < 8) return toast.error("Mínimo 8 caracteres.");
    setBusy(true);
    try {
      await trocarMinhaSenha(novaSenha);
      setNovaSenha(""); toast.success("Senha alterada.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setBusy(false);
    }
  }

  if (!f) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-lg font-semibold">Meu perfil</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Dados</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div><Label>E-mail (login)</Label><Input value={me?.email ?? ""} disabled /></div>
          <div><Label>Telefone</Label><Input value={f.telefone ?? ""} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></div>
          <div><Label>Cidade de atuação</Label><Input value={f.cidade_atuacao} disabled /></div>
          <Button size="sm" onClick={salvarPerfil}>Salvar perfil</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Trocar senha</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div><Label>Nova senha (mín. 8)</Label><Input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} minLength={8} /></div>
          <Button size="sm" onClick={trocarSenha} disabled={busy}>{busy ? "Alterando…" : "Alterar senha"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}