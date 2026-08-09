import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function aplicar(session: Session | null) {
      if (!ativo) return;
      setUser(session?.user ?? null);
      if (!session?.user) {
        setIsAdmin(false);
        setCarregando(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!ativo) return;
      setIsAdmin(Boolean(data));
      setCarregando(false);
    }

    supabase.auth.getSession().then(({ data }) => void aplicar(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void aplicar(session);
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, isAdmin, carregando };
}
