import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { consumirRedirectPosLogin } from "@/lib/reserva";
import { useCarrinho } from "@/lib/carrinho";
import { EMPRESA, formatBRL } from "@/data/rotas";
import { senhaForte, SENHA_MIN, SENHA_REGRA_TEXTO } from "@/lib/senha";
import { whatsappLink } from "@/lib/whatsapp";
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
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { itens: itensCarrinho, pronto: carrinhoPronto, total: totalCarrinho } = useCarrinho();

  // Quem já está logado não precisa ver o formulário.
  useEffect(() => {
    void sessaoAtual().then((sessao) => {
      if (sessao) seguirAposEntrar(navigate);
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // A regra forte só vale pra CRIAR senha — login aceita a senha que a
    // pessoa já tem, mesmo que tenha sido cadastrada antes desta regra.
    if (modo === "criar" && !senhaForte(senha)) {
      toast.error(SENHA_REGRA_TEXTO);
      return;
    }
    if (modo === "entrar" && !senha) {
      toast.error("Informe sua senha.");
      return;
    }
    // Sem WhatsApp válido a reserva não pode ser operacionalizada — ninguém
    // consegue avisar o cliente sobre o carro.
    if (modo === "criar" && !telefoneValido(telefone)) {
      toast.error("Informe um WhatsApp válido (com DDD).");
      return;
    }
    setEnviando(true);
    try {
      if (modo === "entrar") {
        await entrar({ data: { email, senha } });
        toast.success("Bem-vindo de volta!");
      } else {
        await criarConta({ data: { email, senha, nome, telefone } });
        toast.success("Conta criada!");
      }
      seguirAposEntrar(navigate);
    } catch (erro) {
      // As mensagens do servidor já saem em português, escritas à mão
      // (sessao.functions.ts / auth.server.ts — ex.: "Este e-mail já tem conta.").
      toast.error(erro instanceof Error ? erro.message : "Não foi possível concluir.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-md px-4 py-section">
        <h1 className="font-display text-fluid-2xl">
          {modo === "entrar" ? "Entrar na sua conta" : "Criar conta"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {carrinhoPronto && itensCarrinho.length > 0
            ? "Falta pouco para confirmar sua reserva."
            : "Agende suas corridas e acompanhe o status de cada transfer."}
        </p>

        {carrinhoPronto && itensCarrinho.length > 0 && (
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
                  autoComplete="name"
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
              autoComplete="email"
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
              autoComplete={modo === "criar" ? "new-password" : "current-password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="mt-2"
              minLength={modo === "criar" ? SENHA_MIN : undefined}
            />
            {modo === "criar" && (
              <p className="mt-1 text-xs text-muted-foreground">{SENHA_REGRA_TEXTO}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </Button>

          <button
            type="button"
            onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
            className="w-full pt-2 text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {modo === "entrar" ? "Não tenho conta — criar agora" : "Já tenho conta — entrar"}
          </button>
        </form>

        {/* Ainda não há envio de e-mail no site, então a recuperação de senha é
            feita por nós, pelo WhatsApp (o admin redefine em Usuários e acessos). */}
        {modo === "entrar" && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Esqueceu a senha?{" "}
            <a
              href={whatsappLink(`Olá, ${EMPRESA.nome}! Esqueci a senha da minha conta no site.`)}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Chame a gente no WhatsApp
            </a>{" "}
            que redefinimos.
          </p>
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
