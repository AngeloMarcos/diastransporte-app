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
import { consumirRedirectPosLogin } from "@/lib/reserva";
import { useCarrinho } from "@/lib/carrinho";
import { formatBRL } from "@/data/rotas";
import { traduzirErroAuth } from "@/lib/auth-erros";
import { MODO_VPS } from "@/lib/vps/config";
import { criarConta, entrar, sessaoAtual } from "@/lib/vps/sessao.functions";

const TELEFONE_MIN_DIGITOS = 10;

function telefoneValido(v: string | null | undefined) {
  return (v ?? "").replace(/\D/g, "").length >= TELEFONE_MIN_DIGITOS;
}

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
  const [modo, setModo] = useState<"entrar" | "criar" | "recuperar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pedindoTelefone, setPedindoTelefone] = useState(false);
  const [telefonePendente, setTelefonePendente] = useState("");
  const [emRecuperacaoSenha, setEmRecuperacaoSenha] = useState(false);
  const [novaSenhaRecuperacao, setNovaSenhaRecuperacao] = useState("");
  const { itens: itensCarrinho, pronto: carrinhoPronto, total: totalCarrinho } = useCarrinho();

  useEffect(() => {
    if (MODO_VPS) {
      void sessaoAtual().then((sessao) => {
        if (sessao) seguirAposEntrar(navigate);
      });
      return;
    }
    // onAuthStateChange (não getSession) porque precisa distinguir "já
    // estava logado, manda pra minhas-viagens" de "chegou aqui pelo link de
    // redefinição de senha por e-mail" — os dois criam uma sessão, mas só o
    // primeiro deve navegar embora direto.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setEmRecuperacaoSenha(true);
        return;
      }
      if (event === "INITIAL_SESSION" && session) {
        seguirAposEntrar(navigate);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // Login por e-mail/Google não obrigava WhatsApp (só o cadastro por
  // formulário pedia) — uma conta assim gerava reserva sem telefone, que
  // ninguém consegue avisar sobre o carro. Verifica isso logo após entrar
  // e, se faltar, pede antes de liberar o resto do site.
  async function seguirOuPedirTelefone() {
    const { data } = await supabase.auth.getUser();
    const usuario = data.user;
    if (!usuario) {
      seguirAposEntrar(navigate);
      return;
    }
    const { data: perfil } = await supabase
      .from("profiles")
      .select("telefone")
      .eq("id", usuario.id)
      .maybeSingle();
    if (telefoneValido(perfil?.telefone)) {
      seguirAposEntrar(navigate);
      return;
    }
    setTelefonePendente(perfil?.telefone ?? "");
    setPedindoTelefone(true);
  }

  async function salvarTelefonePendente(e: React.FormEvent) {
    e.preventDefault();
    if (!telefoneValido(telefonePendente)) {
      toast.error("Informe um WhatsApp válido (com DDD).");
      return;
    }
    setEnviando(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { error } = await supabase
          .from("profiles")
          .update({ telefone: telefonePendente })
          .eq("id", data.user.id);
        if (error) throw error;
      }
      seguirAposEntrar(navigate);
    } catch (erro) {
      toast.error(traduzirErroAuth(erro));
    } finally {
      setEnviando(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (modo === "criar" && !telefoneValido(telefone)) {
      toast.error("Informe um WhatsApp válido (com DDD).");
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
        await seguirOuPedirTelefone();
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
      toast.error(traduzirErroAuth(erro));
    } finally {
      setEnviando(false);
    }
  }

  async function enviarLinkRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu e-mail.");
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth",
      });
      if (error) throw error;
      toast.success("Enviamos um link de redefinição para o seu e-mail.");
      setModo("entrar");
    } catch (erro) {
      toast.error(traduzirErroAuth(erro));
    } finally {
      setEnviando(false);
    }
  }

  async function definirNovaSenha(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenhaRecuperacao.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenhaRecuperacao });
      if (error) throw error;
      toast.success("Senha redefinida! Você já está conectado.");
      setEmRecuperacaoSenha(false);
      seguirAposEntrar(navigate);
    } catch (erro) {
      toast.error(traduzirErroAuth(erro));
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
    await seguirOuPedirTelefone();
  }

  if (emRecuperacaoSenha) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-md px-4 py-section">
          <h1 className="font-display text-fluid-2xl">Defina sua nova senha</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha uma senha nova para a sua conta.
          </p>
          <form
            onSubmit={definirNovaSenha}
            className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6"
          >
            <div>
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                required
                minLength={6}
                value={novaSenhaRecuperacao}
                onChange={(e) => setNovaSenhaRecuperacao(e.target.value)}
                className="mt-2"
              />
            </div>
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              Salvar nova senha
            </Button>
          </form>
        </main>
        <Footer />
      </div>
    );
  }

  if (pedindoTelefone) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-md px-4 py-section">
          <h1 className="font-display text-fluid-2xl">Falta um passo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta ainda não tem um WhatsApp cadastrado. Sem ele ninguém consegue avisar você
            sobre o carro — informe um número válido para continuar.
          </p>
          <form
            onSubmit={salvarTelefonePendente}
            className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6"
          >
            <div>
              <Label htmlFor="telefone-pendente">WhatsApp</Label>
              <Input
                id="telefone-pendente"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={telefonePendente}
                onChange={(e) => setTelefonePendente(e.target.value)}
                placeholder="(98) 98150-6268"
                className="mt-2"
                maxLength={30}
              />
            </div>
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              Salvar e continuar
            </Button>
          </form>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-md px-4 py-section">
        <h1 className="font-display text-fluid-2xl">
          {modo === "entrar"
            ? "Entrar na sua conta"
            : modo === "criar"
              ? "Criar conta"
              : "Recuperar senha"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {modo === "recuperar"
            ? "Informe seu e-mail e enviaremos um link para você criar uma nova senha."
            : carrinhoPronto && itensCarrinho.length > 0
              ? "Falta pouco para confirmar sua reserva."
              : "Agende suas corridas e acompanhe o status de cada transfer."}
        </p>

        {modo !== "recuperar" && carrinhoPronto && itensCarrinho.length > 0 && (
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
            <p className="font-medium">
              {itensCarrinho.length} trecho{itensCarrinho.length > 1 ? "s" : ""} no carrinho
              {totalCarrinho ? ` · ${formatBRL(totalCarrinho)}` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {modo === "entrar" ? "Entre" : "Crie sua conta"} para voltar direto ao carrinho e
              finalizar a reserva.
            </p>
          </div>
        )}

        {modo === "recuperar" ? (
          <form
            onSubmit={(e) => void enviarLinkRecuperacao(e)}
            className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6"
          >
            <div>
              <Label htmlFor="email-recuperar">E-mail</Label>
              <Input
                id="email-recuperar"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2"
                maxLength={255}
              />
            </div>
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              Enviar link de redefinição
            </Button>
            <button
              type="button"
              onClick={() => setModo("entrar")}
              className="w-full pt-2 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Voltar para o login
            </button>
          </form>
        ) : (
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
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
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
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                {modo === "entrar" && !MODO_VPS && (
                  <button
                    type="button"
                    onClick={() => setModo("recuperar")}
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
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
              {enviando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
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
        )}

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
