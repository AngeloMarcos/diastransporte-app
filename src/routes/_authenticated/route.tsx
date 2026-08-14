import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { MODO_VPS } from "@/lib/vps/config";
import { sessaoAtual } from "@/lib/vps/sessao.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Deploy próprio: a sessão é um cookie HttpOnly validado no servidor.
    if (MODO_VPS) {
      const sessao = await sessaoAtual().catch(() => null);
      if (!sessao) throw redirect({ to: "/auth" });
      return { user: { id: sessao.id, email: sessao.email } };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
