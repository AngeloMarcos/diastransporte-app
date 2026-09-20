// Página do convite de acesso do motorista (link gerado pelo admin — ver
// vps/convite.functions.ts). O motorista escolhe a própria senha e já entra.
// Usa public.convites (migration 0016).
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { senhaForte, SENHA_MIN, SENHA_REGRA_TEXTO } from "@/lib/senha";
import { aceitarConvite, verificarConvite } from "@/lib/vps/convite.functions";

export const Route = createFileRoute("/convite/$token")({
  loader: async ({ params }): Promise<{ valido: boolean; nome: string }> => {
    try {
      const r = await verificarConvite({ data: { token: params.token } });
      return r.valido ? { valido: true, nome: r.nome } : { valido: false, nome: "" };
    } catch {
      return { valido: false, nome: "" };
    }
  },
  head: () => ({
    meta: [
      { title: "Definir senha — Dias Transporte" },
      // Link pessoal e de uso único: nunca indexar.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Convite,
});

function Convite() {
  const { token } = Route.useParams();
  const { valido, nome } = Route.useLoaderData();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!senhaForte(senha)) {
      setErro(SENHA_REGRA_TEXTO);
      return;
    }
    if (senha !== confirmar) {
      setErro("As senhas não são iguais.");
      return;
    }
    setErro("");
    setEnviando(true);
    try {
      await aceitarConvite({ data: { token, senha } });
      toast.success("Senha definida. Bem-vindo!");
      // Recarga completa: a sessão nova está no cookie e todas as telas leem
      // o estado de login do zero.
      window.location.assign("/motorista");
    } catch (e2) {
      setErro(e2 instanceof Error ? e2.message : "Não foi possível definir a senha.");
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-md px-4 py-section">
        {valido ? (
          <>
            <h1 className="font-display text-fluid-xl">
              Olá{nome ? `, ${nome.split(" ")[0]}` : ""}!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha a senha que você vai usar para entrar e ver suas corridas.
            </p>
            <form onSubmit={(e) => void enviar(e)} className="mt-6 space-y-4" noValidate>
              <div>
                <Label htmlFor="senha">Nova senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="new-password"
                  minLength={SENHA_MIN}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  aria-invalid={Boolean(erro)}
                  aria-describedby="regra-senha"
                  className="mt-2 h-11"
                />
                <p id="regra-senha" className="mt-1 text-xs text-muted-foreground">
                  {SENHA_REGRA_TEXTO}
                </p>
              </div>
              <div>
                <Label htmlFor="confirmar">Repita a senha</Label>
                <Input
                  id="confirmar"
                  type="password"
                  autoComplete="new-password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className="mt-2 h-11"
                />
              </div>
              {erro && (
                <p role="alert" className="text-sm text-red-400">
                  {erro}
                </p>
              )}
              <Button type="submit" className="h-11 w-full" disabled={enviando}>
                {enviando ? <Loader2 className="size-4 animate-spin" /> : null} Definir senha e
                entrar
              </Button>
            </form>
          </>
        ) : (
          <div className="rounded-lg border border-border bg-card p-6">
            <h1 className="font-display text-fluid-lg">Link inválido</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Este link já foi usado ou expirou. Peça um novo ao administrador da Dias Transporte.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
