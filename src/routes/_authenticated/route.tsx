import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
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
    // A sessão é um cookie HttpOnly validado no servidor: aqui só se decide se
    // mostra a tela ou manda pro login (a autorização de verdade — admin,
    // motorista — é refeita em cada server function).
    const sessao = await sessaoAtual().catch(() => null);
    if (!sessao) {
      salvarRedirectPosLogin(location.href);
      throw redirect({ to: "/auth" });
    }
    return { user: { id: sessao.id, email: sessao.email } };
  },
  component: () => <Outlet />,
});
