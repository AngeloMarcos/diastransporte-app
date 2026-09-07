import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
  telefone: z.string().optional().default(""),
  cidade_atuacao: z.string().min(1),
  regiao_atuacao: z.string().optional().default(""),
  categoria_veiculo_id: z.string().uuid().nullable().optional(),
  observacoes_internas: z.string().optional().default(""),
});

export const createMotorista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Verify admin
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Apenas admins podem criar motoristas.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (createErr || !created.user) {
      throw new Error(`Falha ao criar usuário: ${createErr?.message ?? "erro"}`);
    }

    const userId = created.user.id;

    // Assign motorista role
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "motorista" });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Falha ao atribuir papel: ${roleErr.message}`);
    }

    // Create fornecedor row
    const { data: fornecedor, error: fornErr } = await supabaseAdmin
      .from("fornecedores")
      .insert({
        user_id: userId,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone || null,
        cidade_atuacao: data.cidade_atuacao,
        regiao_atuacao: data.regiao_atuacao || null,
        categoria_veiculo_id: data.categoria_veiculo_id || null,
      })
      .select()
      .single();
    if (fornErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(`Falha ao criar fornecedor: ${fornErr.message}`);
    }

    if (data.observacoes_internas.trim()) {
      await supabaseAdmin
        .from("fornecedores_notas_internas")
        .insert({ fornecedor_id: fornecedor.id, observacoes_internas: data.observacoes_internas.trim() });
    }

    return { userId, fornecedor };
  });

const removeSchema = z.object({ fornecedor_id: z.string().uuid() });

export const removerMotorista = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => removeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin")) {
      throw new Error("Apenas admins podem remover motoristas.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: fornecedor, error: readErr } = await supabaseAdmin
      .from("fornecedores")
      .select("id, user_id")
      .eq("id", data.fornecedor_id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!fornecedor) throw new Error("Motorista não encontrado.");

    const { count } = await supabaseAdmin
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("fornecedor_id", fornecedor.id);

    if ((count ?? 0) > 0) {
      // Preserva histórico: apenas desativa e revoga o acesso.
      const { error } = await supabaseAdmin
        .from("fornecedores")
        .update({ ativo: false, user_id: null })
        .eq("id", fornecedor.id);
      if (error) throw new Error(error.message);
      if (fornecedor.user_id) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", fornecedor.user_id);
        await supabaseAdmin.auth.admin.deleteUser(fornecedor.user_id);
      }
      return { desativado: true, removido: false };
    }

    const { error: delErr } = await supabaseAdmin.from("fornecedores").delete().eq("id", fornecedor.id);
    if (delErr) throw new Error(delErr.message);
    if (fornecedor.user_id) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", fornecedor.user_id);
      await supabaseAdmin.auth.admin.deleteUser(fornecedor.user_id);
    }
    return { desativado: false, removido: true };
  });

// promoteToAdmin foi removido: bootstrap público era vulnerável (qualquer visitante
// podia se promover a admin antes do operador legítimo). O primeiro admin agora é
// criado via migration/SQL direto no banco.