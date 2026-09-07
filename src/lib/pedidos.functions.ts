import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pedidosImportSchema } from "@/lib/pedidos-import.schema";

export const importarPedidos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => pedidosImportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Apenas admins podem importar pedidos.");
    }

    const codigos = data.rows
      .map((r) => r.codigo_reserva_canal)
      .filter((c): c is string => !!c && c.length > 0);

    const existentes = new Set<string>();
    for (let i = 0; i < codigos.length; i += 200) {
      const chunk = codigos.slice(i, i + 200);
      const { data: found, error } = await context.supabase
        .from("pedidos")
        .select("codigo_reserva_canal")
        .in("codigo_reserva_canal", chunk);
      if (error) throw new Error(error.message);
      (found ?? []).forEach((f) => f.codigo_reserva_canal && existentes.add(f.codigo_reserva_canal));
    }

    const vistos = new Set<string>();
    const aInserir = data.rows.filter((r) => {
      const c = r.codigo_reserva_canal;
      if (!c) return true;
      if (existentes.has(c) || vistos.has(c)) return false;
      vistos.add(c);
      return true;
    });

    const ignorados = data.rows.length - aInserir.length;
    let inseridos = 0;

    for (let i = 0; i < aInserir.length; i += 100) {
      const chunk = aInserir.slice(i, i + 100);
      const { error } = await context.supabase.from("pedidos").insert(chunk);
      if (error) throw new Error(`Erro ao inserir lote ${i / 100 + 1}: ${error.message}`);
      inseridos += chunk.length;
    }

    return { inseridos, ignorados };
  });