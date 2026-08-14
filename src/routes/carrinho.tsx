import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ItemCarrinhoCard } from "@/components/site/ItemCarrinhoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/data/rotas";
import { useAuth } from "@/hooks/useAuth";
import { useCarrinho } from "@/lib/carrinho";
import { criarReservas, perfilContato } from "@/lib/dados";
import { salvarRedirectPosLogin } from "@/lib/reserva";
import { mensagemCarrinho, whatsappLink } from "@/lib/whatsapp";
import { CarrinhoSkeleton } from "@/components/site/Skeletons";
import { ErroCarregamento } from "@/components/site/ErroCarregamento";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Seu carrinho de transfers — Dias Transporte" },
      {
        name: "description",
        content:
          "Revise os transfers escolhidos, confira o total por veículo e finalize a reserva pelo WhatsApp com a Dias Transporte.",
      },
      { property: "og:title", content: "Seu carrinho de transfers — Dias Transporte" },
      {
        property: "og:description",
        content: "Revise os transfers escolhidos e finalize sua reserva em poucos toques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Carrinho,
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: () => (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-gutter pb-8 pt-8">
        <CarrinhoSkeleton />
      </main>
      <Footer />
    </div>
  ),
  errorComponent: () => (
    <ErroCarregamento
      titulo="Não conseguimos abrir seu carrinho"
      descricao="Seus itens continuam salvos neste navegador. Tente de novo em instantes."
      voltarPara="/transfers"
      voltarLabel="Ver transfers"
    />
  ),
});

function Carrinho() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { itens, pronto, total, remover, limpar } = useCarrinho();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const perfil = await perfilContato(user.id).catch(() => null);
      setNome((atual) => atual || perfil?.nome || user.email || "");
      setTelefone((atual) => atual || perfil?.telefone || "");
    })();
  }, [user]);

  const link = whatsappLink(
    mensagemCarrinho(
      itens.map((i) => ({
        trecho: i.trecho,
        data: i.data || undefined,
        hora: i.hora || undefined,
        periodo: i.periodo === "noite" ? "Noite (18h às 5h)" : "Dia",
        carro: i.carro === "pequeno" ? "Carro pequeno (até 4)" : "Carro grande (até 5)",
        passageiros: i.passageiros,
        embarque: i.embarqueLocal || undefined,
        valor: i.valor ? formatBRL(i.valor) : "sob consulta",
      })),
      {
        total: total ? formatBRL(total) : undefined,
        nome: nome || undefined,
        telefone: telefone || undefined,
      },
    ),
  );

  async function finalizar() {
    if (itens.length === 0) return;
    if (!user) {
      salvarRedirectPosLogin("/carrinho");
      void navigate({ to: "/auth" });
      return;
    }
    setEnviando(true);
    try {
      // O valor NÃO é enviado: o banco calcula o preço oficial da rota.
      const gravados = await criarReservas(
        itens.map((i) => ({
          rota_id: i.rotaId,
          trecho: i.trecho,
          data_viagem: i.data || null,
          hora: i.hora || null,
          periodo: i.periodo === "noite" ? ("noite" as const) : ("dia" as const),
          carro: i.carro === "grande" ? ("grande" as const) : ("pequeno" as const),
          passageiros: i.passageiros,
          embarque_local: i.embarqueLocal || null,
          observacoes: i.observacoes || null,
          contato_nome: nome || user.email || null,
          contato_telefone: telefone || null,
        })),
        user.id,
      );
      const totalOficial = gravados.reduce((s, r) => s + (r.valor ?? 0), 0);
      const divergente =
        (gravados ?? []).length > 0 &&
        totalOficial !== itens.reduce((s, i) => s + (i.valor ?? 0), 0);
      const destino = link;
      limpar();
      if (divergente) {
        toast.success("Reserva registrada com o preço atualizado da tabela oficial.");
      } else {
        toast.success("Reserva registrada! Vamos confirmar pelo WhatsApp.");
      }
      window.open(destino, "_blank", "noreferrer");
      void navigate({ to: "/minhas-viagens" });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível finalizar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-3xl px-gutter pb-8 pt-8">
        <h1 className="font-display text-fluid-2xl">Seu carrinho</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Valores por veículo. A confirmação final é feita pelo WhatsApp.
        </p>

        {!pronto ? (
          <CarrinhoSkeleton />
        ) : itens.length === 0 ? (
          <div className="mt-10 rounded-lg border border-border bg-card p-8 text-center">
            <ShoppingBag className="mx-auto size-8 text-primary" />
            <p className="mt-4 font-display text-fluid-lg">Carrinho vazio</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha um trecho e adicione ao carrinho para reservar.
            </p>
            <Button asChild className="mt-6">
              <Link to="/transfers">Ver transfers</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              {itens.map((item) => (
                <ItemCarrinhoCard key={item.id} item={item} onRemover={remover} />
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nome">Seu nome</Label>
                <Input
                  id="nome"
                  name="name"
                  autoComplete="name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como podemos te chamar?"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="telefone">WhatsApp</Label>
                <Input
                  id="telefone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(98) 90000-0000"
                  className="mt-2"
                />
              </div>
            </div>

            {/* Resumo em telas grandes */}
            <div className="mt-8 hidden items-center justify-between rounded-lg border border-border bg-card p-6 md:flex">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total</p>
                <p className="font-display text-3xl">{total ? formatBRL(total) : "Sob consulta"}</p>
                <p className="text-xs text-muted-foreground">
                  {itens.length} {itens.length === 1 ? "transfer" : "transfers"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="secondary" className="bg-whats text-whats-foreground">
                  <a href={link} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </Button>
                <Button disabled={enviando} onClick={() => void finalizar()}>
                  {user ? "Finalizar reserva" : "Entrar e finalizar"}
                </Button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Barra fixa no rodapé (mobile) — total + finalizar sempre visíveis */}
      {pronto && itens.length > 0 ? (
        <>
          <div aria-hidden className="h-24 md:hidden" />
          <div className="fixed inset-x-0 bottom-[calc(4.25rem+var(--safe-bottom))] z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Total</p>
                <p className="truncate font-display text-2xl">
                  {total ? formatBRL(total) : "Sob consulta"}
                </p>
              </div>
              <Button
                className="min-h-11 shrink-0"
                disabled={enviando}
                onClick={() => void finalizar()}
              >
                {user ? "Finalizar reserva" : "Entrar e finalizar"}
              </Button>
            </div>
          </div>
        </>
      ) : null}

      <Footer />
    </div>
  );
}
