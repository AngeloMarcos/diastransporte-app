import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { MODO_VPS } from "@/lib/vps/config";
import { sair, sessaoAtual, type SessaoAtual } from "@/lib/vps/sessao.functions";

/**
 * Mantém public.profiles em sincronia com o e-mail/nome do Auth.
 * Não é possível criar trigger em auth.users (schema gerenciado), então
 * a sincronia acontece no login, na própria linha do usuário (RLS).
 */
const perfisSincronizados = new Set<string>();

async function sincronizarPerfil(user: User) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const chave = `${user.id}:${user.email ?? ""}`;
  if (perfisSincronizados.has(chave)) return;
  perfisSincronizados.add(chave);
  const nome = String(meta["nome"] ?? meta["full_name"] ?? "").trim();
  const telefone = String(meta["telefone"] ?? "").trim();
  const { data: atual } = await supabase
    .from("profiles")
    .select("email, nome, telefone")
    .eq("id", user.id)
    .maybeSingle();
  const desatualizado =
    !atual ||
    atual.email !== (user.email ?? null) ||
    (nome && atual.nome !== nome) ||
    (telefone && atual.telefone !== telefone);
  if (!desatualizado) return;
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      nome: nome || (atual?.nome ?? null),
      telefone: telefone || (atual?.telefone ?? null),
    },
    { onConflict: "id" },
  );
}

/** Converte a sessão própria (VPS) no mesmo formato que as telas já usam. */
function usuarioDoModoVps(sessao: NonNullable<SessaoAtual>): User {
  return {
    id: sessao.id,
    email: sessao.email,
    user_metadata: { nome: sessao.nome, telefone: sessao.telefone },
    app_metadata: {},
    aud: "authenticated",
    created_at: "",
  } as User;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    // Deploy próprio: a sessão vem do cookie HttpOnly, lida no servidor.
    if (MODO_VPS) {
      sessaoAtual()
        .then((sessao) => {
          if (!ativo) return;
          setUser(sessao ? usuarioDoModoVps(sessao) : null);
          setIsAdmin(Boolean(sessao?.admin));
        })
        .catch(() => {
          if (ativo) {
            setUser(null);
            setIsAdmin(false);
          }
        })
        .finally(() => {
          if (ativo) setCarregando(false);
        });
      return () => {
        ativo = false;
      };
    }

    async function aplicar(session: Session | null) {
      if (!ativo) return;
      setUser(session?.user ?? null);
      if (!session?.user) {
        setIsAdmin(false);
        setCarregando(false);
        return;
      }
      void sincronizarPerfil(session.user).catch(() => undefined);
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

/** Encerra a sessão na infraestrutura ativa. */
export async function encerrarSessaoAtual() {
  if (MODO_VPS) {
    await sair();
    return;
  }
  await supabase.auth.signOut();
}
