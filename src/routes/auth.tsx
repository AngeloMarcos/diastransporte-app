import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { consumirRedirectPosLogin, lerRascunho, type RascunhoReserva } from "@/lib/reserva";
import { MODO_VPS } from "@/lib/vps/config";
import { criarConta, entrar, sessaoAtual } from "@/lib/vps/sessao.functions";

function seguirAposEntrar(navigate: ReturnType<typeof useNavigate>) {
  const redirect = consumirRedirectPosLogin();
  if (redirect) {
    window.location.assign(redirect);
    return;
  }
  void navigate({ to: "/minhas-viagens" });
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — Dias Transporte" },
      {
        name: "description",
        content:
          "Acesse sua conta Dias Transporte para agendar transfers em São Luís e nos Lençóis Maranhenses e acompanhar suas viagens.",
      },
      { property: "og:title", content: "Entrar ou criar conta — Dias Transporte" },
      {
        property: "og:description",
        content: "Área do cliente: agende corridas e acompanhe seus transfers.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoReserva | null>(null);

  useEffect(() => {
    if (MODO_VPS) {
      void sessaoAtual().then((sessao) => {
        if (sessao) seguirAposEntrar(navigate);
      });
    } else {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) seguirAposEntrar(navigate);
      });
    }
    // Lido só no cliente (depois da hidratação) pra não divergir do HTML do SSR.
    setRascunho(lerRascunho());
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setEnviando(true);
    try {
      // Deploy próprio: login pela sessão em cookie (src/lib/vps/sessao.functions.ts).
      if (MODO_VPS) {
        if (modo === "entrar") {
          await entrar({ data: { email, senha } });
          toast.success("Bem-vindo de volta!");
        } else {
          await criarConta({ data: { email, senha, nome, telefone } });
          toast.success("Conta criada!");
        }
        seguirAposEntrar(navigate);
      } else if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        seguirAposEntrar(navigate);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome, telefone },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada!");
          seguirAposEntrar(navigate);
        } else {
          toast.success("Conta criada. Confirme seu e-mail para entrar.");
        }
      }
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível concluir.");
    } finally {
      setEnviando(false);
    }
  }

  async function entrarComGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    seguirAposEntrar(navigate);
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-md px-4 py-section">
        <h1 className="font-display text-fluid-2xl">
          {modo === "entrar" ? "Entrar na sua conta" : "Criar conta"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {rascunho
            ? "Falta pouco para confirmar sua reserva."
            : "Agende suas corridas e acompanhe o status de cada transfer."}
        </p>

        {rascunho && (
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
            <p className="font-medium">
              {rascunho.origem} → {rascunho.destino}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {modo === "entrar" ? "Entre" : "Crie sua conta"} para voltar direto para essa reserva
              com os dados que você já preencheu.
            </p>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6"
        >
          {modo === "criar" && (
            <>
              <div>
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  className="mt-2"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="telefone">WhatsApp</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(98) 98150-6268"
                  className="mt-2"
                  maxLength={30}
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2"
              maxLength={255}
            />
          </div>
          <div>
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="mt-2"
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </Button>

          {/* O login com Google é do backend gerenciado; no deploy próprio some. */}
          {!MODO_VPS && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => void entrarComGoogle()}
            >
              Continuar com Google
            </Button>
          )}

          <button
            type="button"
            onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
            className="w-full pt-2 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {modo === "entrar" ? "Não tenho conta — criar agora" : "Já tenho conta — entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prefere falar direto?{" "}
          <Link to="/contato" className="underline underline-offset-4">
            Fale com a gente
          </Link>
          .
        </p>
      </main>
      <Footer />
    </div>
  );
}
