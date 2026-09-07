// Endpoint interno de integração: o Dias Transporte (vitrine) chama isto
// depois de criar uma reserva, para que ela vire um "pedido" aqui no
// despacho — ver o roteiro "Despacho Unificado", Sprint 3. Servidor-a-
// servidor: sem sessão de usuário, autenticado por token fixo comparado em
// tempo constante (mesmo padrão de vps/auth.server.ts::comparaSegura).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const corpoSchema = z.object({
  // Chave de idempotência: "dias-transporte:<agendamento.id>". Reenvios
  // (ex.: timeout na primeira tentativa) não duplicam o pedido.
  codigo_reserva_canal: z.string().min(1).max(80),
  cidade_atendimento: z.string().min(2).max(120),
  data_hora_encontro: z.string().min(1),
  direcao: z.enum(["IN", "OUT"]),
  passageiro_nome: z.string().min(2).max(200),
  passageiro_telefone: z.string().max(120).nullable(),
  ponto_partida: z.string().max(300).nullable(),
  ponto_chegada: z.string().max(300).nullable(),
  categoria_veiculo_nome: z.enum(["Pequeno", "Grande"]),
  observacoes_internas: z.string().max(2000).nullable(),
});

// Capacidade só é usada a primeira vez que a categoria é criada (upsert por
// nome); em atualizações seguintes o valor já cadastrado no admin prevalece.
const CAPACIDADE_PADRAO: Record<string, number> = { Pequeno: 4, Grande: 8 };

export const Route = createFileRoute("/api/integracoes/dias-transporte")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { comparaSegura } = await import("@/lib/vps/auth.server");
        const esperado = process.env["INTEGRACAO_DIAS_TRANSPORTE_TOKEN"];
        const recebido = request.headers.get("x-integracao-token") ?? "";
        if (!esperado || !comparaSegura(recebido, esperado)) {
          return new Response("Acesso restrito.", { status: 401 });
        }

        let corpo: z.infer<typeof corpoSchema>;
        try {
          corpo = corpoSchema.parse(await request.json());
        } catch {
          return Response.json({ erro: "Corpo inválido." }, { status: 400 });
        }

        const { sql } = await import("@/lib/vps/db.server");
        const db = sql();

        // Canal de venda e categoria de veículo são auto-cadastrados no
        // primeiro pedido que os referencia — não exige um passo de seed
        // manual antes de a integração funcionar.
        const [canal] = await db<{ id: string }[]>`
          INSERT INTO public.canais_venda (nome, tipo)
          VALUES ('Dias Transporte', 'site_proprio')
          ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
          RETURNING id
        `;
        const [categoria] = await db<{ id: string }[]>`
          INSERT INTO public.categorias_veiculo (nome, capacidade_passageiros)
          VALUES (${corpo.categoria_veiculo_nome}, ${CAPACIDADE_PADRAO[corpo.categoria_veiculo_nome] ?? null})
          ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
          RETURNING id
        `;
        if (!canal || !categoria) {
          return Response.json({ erro: "Falha ao preparar canal/categoria." }, { status: 500 });
        }

        const resultado = await db.begin(async (tx) => {
          // ON CONFLICT DO NOTHING em vez de "SELECT existe? depois insere":
          // evita corrida entre uma checagem e um insert quando a mesma
          // reserva chega duas vezes quase ao mesmo tempo (retry de rede).
          const [criado] = await tx<{ id: number }[]>`
            INSERT INTO public.pedidos
              (codigo_reserva_canal, canal_venda_id, cidade_atendimento, data_hora_encontro,
               direcao, passageiro_nome, passageiro_telefone, ponto_partida, ponto_chegada,
               categoria_veiculo_id)
            VALUES (${corpo.codigo_reserva_canal}, ${canal.id}, ${corpo.cidade_atendimento},
                    ${corpo.data_hora_encontro}, ${corpo.direcao}, ${corpo.passageiro_nome},
                    ${corpo.passageiro_telefone}, ${corpo.ponto_partida}, ${corpo.ponto_chegada},
                    ${categoria.id})
            ON CONFLICT (codigo_reserva_canal) WHERE codigo_reserva_canal IS NOT NULL AND codigo_reserva_canal <> ''
            DO NOTHING
            RETURNING id
          `;
          if (!criado) {
            const [existente] = await tx<{ id: number }[]>`
              SELECT id FROM public.pedidos WHERE codigo_reserva_canal = ${corpo.codigo_reserva_canal}
            `;
            return { id: existente?.id ?? null, duplicado: true };
          }
          await tx`
            INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo)
            VALUES (${criado.id}, NULL, 'pendente_liberacao')
          `;
          if (corpo.observacoes_internas) {
            await tx`
              INSERT INTO public.pedidos_notas_internas (pedido_id, observacoes_internas)
              VALUES (${criado.id}, ${corpo.observacoes_internas})
            `;
          }
          return { id: criado.id, duplicado: false };
        });

        if (resultado.id === null) {
          return Response.json({ erro: "Pedido duplicado não encontrado." }, { status: 500 });
        }
        return Response.json(
          { id: resultado.id, duplicado: resultado.duplicado },
          { status: resultado.duplicado ? 200 : 201 },
        );
      },
    },
  },
});
