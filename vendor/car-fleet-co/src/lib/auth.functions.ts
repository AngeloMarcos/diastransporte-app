import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ role: "admin" | "motorista" | null; fornecedorId: string | null }> => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    let role: "admin" | "motorista" | null = null;
    if (roles?.some((r) => r.role === "admin")) role = "admin";
    else if (roles?.some((r) => r.role === "motorista")) role = "motorista";

    let fornecedorId: string | null = null;
    if (role === "motorista") {
      const { data } = await context.supabase
        .from("fornecedores")
        .select("id")
        .eq("user_id", context.userId)
        .maybeSingle();
      fornecedorId = data?.id ?? null;
    }

    return { role, fornecedorId };
  });