import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/auth.functions";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const fetchRole = useServerFn(getMyRole);
  const [msg, setMsg] = useState("Carregando…");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      try {
        const { role } = await fetchRole();
        if (role === "admin") navigate({ to: "/admin", replace: true });
        else if (role === "motorista") navigate({ to: "/motorista", replace: true });
        else setMsg("Sua conta ainda não tem papel atribuído. Peça a um admin para liberar seu acesso.");
      } catch {
        setMsg("Erro ao verificar seu acesso. Tente sair e entrar novamente.");
      }
    })();
  }, [fetchRole, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8 text-center text-sm text-muted-foreground">
      {msg}
    </div>
  );
}
