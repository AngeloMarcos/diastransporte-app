// Checagem simples de disponibilidade (Lovable Cloud): "já existe outra
// reserva ativa pra esse carro nessa data?" — um aviso não-bloqueante, não
// uma trava rígida (não temos duração exata de cada trecho pra saber se dois
// horários realmente colidem, então preferimos avisar a recusar uma reserva
// válida por engano). Usa o cliente de serviço porque RLS não deixa um
// cliente comum ver reservas de outras pessoas — só devolve uma contagem,
// nunca quem fez a outra reserva.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const contarReservasMesmoCarroData = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ carro: z.enum(["pequeno", "grande"]), data: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }): Promise<number> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count, error } = await supabaseAdmin
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("carro", data.carro)
        .eq("data_viagem", data.data)
        .in("status", ["pendente", "confirmado"]);
      if (error) return 0;
      return count ?? 0;
    } catch {
      // Sem credenciais de serviço configuradas (ambiente local sem
      // SUPABASE_SERVICE_ROLE_KEY, por exemplo) — falha em silêncio, é só
      // um aviso a mais, não deve travar o checkout.
      return 0;
    }
  });
