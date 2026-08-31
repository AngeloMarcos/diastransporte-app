import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { registrarAuditoria } from "@/lib/auditoria";
import { senhaForte, SENHA_REGRA_TEXTO } from "@/lib/senha";

export type UsuarioAdmin = {
  id: string;
  email: string;
  nome: string;
  telefone: string;
  criadoEm: string;
  ultimoAcesso: string | null;
  confirmado: boolean;
  isAdmin: boolean;
  agendamentos: number;
};

async function garantirAdmin(
  supabase: {
    rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }>;
  },
  userId: string,
) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Acesso restrito a administradores.");
}

export const listUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsuarioAdmin[]> => {
    await garantirAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: lista }, { data: perfis }, { data: papeis }, { data: agendamentos }] =
      await Promise.all([
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        supabaseAdmin.from("profiles").select("id, email, nome, telefone"),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("agendamentos").select("user_id"),
      ]);

    const perfilPor = new Map((perfis ?? []).map((p) => [p.id, p]));
    const adminIds = new Set(
      (papeis ?? []).filter((p) => p.role === "admin").map((p) => p.user_id),
    );
    const contagem = new Map<string, number>();
    for (const a of agendamentos ?? []) {
      if (!a.user_id) continue;
      contagem.set(a.user_id, (contagem.get(a.user_id) ?? 0) + 1);
    }

    return (lista?.users ?? []).map((u) => {
      const perfil = perfilPor.get(u.id);
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      return {
        id: u.id,
        email: u.email ?? perfil?.email ?? "",
        nome: perfil?.nome || String(meta["nome"] ?? meta["full_name"] ?? ""),
        telefone: perfil?.telefone || String(meta["telefone"] ?? ""),
        criadoEm: u.created_at,
        ultimoAcesso: u.last_sign_in_at ?? null,
        confirmado: Boolean(u.email_confirmed_at),
        isAdmin: adminIds.has(u.id),
        agendamentos: contagem.get(u.id) ?? 0,
      };
    });
  });

export const definirPapelAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    await garantirAdmin(context.supabase as never, context.userId);
    if (data.userId === context.userId && !data.admin) {
      throw new Error("Você não pode remover seu próprio acesso de administrador.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.admin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    registrarAuditoria({
      acao: data.admin ? "promover_admin" : "remover_admin",
      atorId: context.userId,
      atorEmail: context.claims["email"] as string | undefined,
      alvoId: data.userId,
    });
    return { ok: true };
  });

export const redefinirSenhaUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        senha: z.string().max(72).refine(senhaForte, SENHA_REGRA_TEXTO),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await garantirAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.senha,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    registrarAuditoria({
      acao: "redefinir_senha",
      atorId: context.userId,
      atorEmail: context.claims["email"] as string | undefined,
      alvoId: data.userId,
    });
    return { ok: true };
  });
