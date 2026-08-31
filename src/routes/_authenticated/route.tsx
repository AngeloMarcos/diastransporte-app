import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { MODO_VPS } from "@/lib/vps/config";
import { sessaoAtual } from "@/lib/vps/sessao.functions";
import { salvarRedirectPosLogin } from "@/lib/reserva";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // Como ssr:false + beforeLoad assíncrono, sem isto a primeira renderização
  // fica completamente em branco (sem cabeçalho, sem spinner) até a checagem
  // de sessão resolver — parecia o site ter travado.
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: () => (
    <div className="min-h-screen">
      <Header />
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
      <Footer />
    </div>
  ),
  beforeLoad: async ({ location }) => {
    // Deploy próprio: a sessão é um cookie HttpOnly validado no servidor.
    if (MODO_VPS) {
      const sessao = await sessaoAtual().catch(() => null);
      if (!sessao) {
        salvarRedirectPosLogin(location.href);
        throw redirect({ to: "/auth" });
      }
      return { user: { id: sessao.id, email: sessao.email } };
    }
    // getSession() lê a sessão local (e aguarda o refresh automático em
    // andamento, se houver) em vez de bater no servidor como getUser() fazia.
    // getUser() era um round-trip de rede a cada navegação pra /admin ou
    // /minhas-viagens: qualquer instabilidade de conexão (comum em celular)
    // ou uma corrida com o refresh do token (ex.: token expirou enquanto a
    // aba ficou em segundo plano) derrubava o usuário pra /auth mesmo com uma
    // sessão válida — sensação de "deslogamento automático". A validação
    // criptográfica de verdade continua acontecendo no servidor (RLS e
    // requireSupabaseAuth), então isto aqui só precisa decidir se mostra ou
    // não a tela; não é a linha de defesa de segurança.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      salvarRedirectPosLogin(location.href);
      throw redirect({ to: "/auth" });
    }
    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
