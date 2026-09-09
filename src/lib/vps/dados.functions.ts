// Camada de dados do deploy próprio (VPS): tudo que no Lovable Cloud passa
// pelo cliente Supabase + RLS aqui passa por estas server functions, que
// autorizam pela sessão em cookie (auth.server.ts) antes de tocar no Postgres.
// Só são chamadas quando VITE_AUTH_MODE=vps (ver src/lib/dados.ts).
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import type {
  AgendamentoRow,
  ConteudoBloco,
  FotoGaleriaRow,
  NovaReserva,
  UsuarioAdmin,
  VeiculoFrotaRow,
} from "@/lib/dados-tipos";
import type { RotaRow } from "@/lib/rotasMap";
import { registrarAuditoria } from "@/lib/auditoria";
import { senhaForte, SENHA_REGRA_TEXTO } from "@/lib/senha";

async function contexto() {
  const [{ lerCookieSessao, exigirUsuario, exigirAdmin, exigirMotorista }, { sql }] =
    await Promise.all([import("./auth.server"), import("./db.server")]);
  const token = lerCookieSessao(getRequestHeader("cookie") ?? null);
  return {
    sql: sql(),
    usuario: () => exigirUsuario(token),
    admin: () => exigirAdmin(token),
    motorista: () => exigirMotorista(token),
  };
}

const COLUNAS_ROTA = `id, slug, origem, destino, ida_e_volta, duracao, distancia,
  preco_pequeno, preco_grande, preco_pequeno_noite, preco_grande_noite, destaque,
  popularidade, resumo, descricao, embarque, foto, galeria, ativo`;

// ------------------------------------------------------------------ rotas
export const vpsListRotasAdmin = createServerFn({ method: "GET" }).handler(
  async (): Promise<RotaRow[]> => {
    const ctx = await contexto();
    await ctx.admin();
    return ctx.sql<RotaRow[]>`
      SELECT ${ctx.sql.unsafe(COLUNAS_ROTA)} FROM public.rotas ORDER BY popularidade DESC
    `.then((linhas) => [...linhas]);
  },
);

// Sem sessão nenhuma — equivalente à policy "Rotas ativas públicas" do
// Supabase (USING (ativo OR admin)), aqui só a metade pública mesmo, já que
// quem quer ver as inativas usa vpsListRotasAdmin. Chamada por
// rotas.functions.ts::listRotas quando MODO_VPS — sem isto, a home e o
// /transfers nunca liam o Postgres da VPS de jeito nenhum (só caíam no
// fallback estático), então editar uma rota no admin não tinha efeito
// nenhum no site público. Bug real, achado revisando o front-end.
export const vpsListRotasPublicas = createServerFn({ method: "GET" }).handler(
  async (): Promise<RotaRow[]> => {
    const { sql } = await import("./db.server");
    const db = sql();
    return db<RotaRow[]>`
      SELECT ${db.unsafe(COLUNAS_ROTA)} FROM public.rotas WHERE ativo ORDER BY popularidade DESC
    `.then((linhas) => [...linhas]);
  },
);

const novaRota = z.object({
  slug: z.string().min(1).max(120),
  origem: z.string().min(1).max(120),
  destino: z.string().min(1).max(120),
  duracao: z.string().max(60).default(""),
  distancia: z.string().max(60).default(""),
  preco_pequeno: z.number().int().min(0).default(0),
  resumo: z.string().max(2000).default(""),
});

export const vpsCriarRota = createServerFn({ method: "POST" })
  .inputValidator((data) => novaRota.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      INSERT INTO public.rotas (slug, origem, destino, duracao, distancia, preco_pequeno, resumo, ativo)
      VALUES (${data.slug}, ${data.origem}, ${data.destino}, ${data.duracao}, ${data.distancia},
              ${data.preco_pequeno}, ${data.resumo}, false)
    `;
    return { ok: true };
  });

const rotaEditada = z.object({
  id: z.string().uuid(),
  origem: z.string().min(1).max(120),
  destino: z.string().min(1).max(120),
  duracao: z.string().max(60),
  distancia: z.string().max(60),
  preco_pequeno: z.number().int().min(0),
  preco_grande: z.number().int().min(0).nullable(),
  preco_pequeno_noite: z.number().int().min(0).nullable(),
  preco_grande_noite: z.number().int().min(0).nullable(),
  destaque: z.string().max(120).nullable(),
  resumo: z.string().max(2000),
  descricao: z.string().max(8000),
  foto: z.string().max(2000),
  galeria: z.array(z.string().max(2000)).max(30),
  ativo: z.boolean(),
});

export const vpsSalvarRota = createServerFn({ method: "POST" })
  .inputValidator((data) => rotaEditada.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      UPDATE public.rotas SET
        origem = ${data.origem},
        destino = ${data.destino},
        duracao = ${data.duracao},
        distancia = ${data.distancia},
        preco_pequeno = ${data.preco_pequeno},
        preco_grande = ${data.preco_grande},
        preco_pequeno_noite = ${data.preco_pequeno_noite},
        preco_grande_noite = ${data.preco_grande_noite},
        destaque = ${data.destaque},
        resumo = ${data.resumo},
        descricao = ${data.descricao},
        foto = ${data.foto},
        galeria = ${data.galeria},
        ativo = ${data.ativo}
      WHERE id = ${data.id}
    `;
    return { ok: true };
  });

export const vpsRemoverRota = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`DELETE FROM public.rotas WHERE id = ${data.id}`;
    return { ok: true };
  });

// ----------------------------------------------------------- agendamentos
export const vpsListAgendamentos = createServerFn({ method: "GET" }).handler(
  async (): Promise<AgendamentoRow[]> => {
    const ctx = await contexto();
    await ctx.admin();
    return ctx.sql<AgendamentoRow[]>`
      SELECT * FROM public.agendamentos ORDER BY created_at DESC
    `.then((linhas) => [...linhas]);
  },
);

export const vpsMinhasViagens = createServerFn({ method: "GET" }).handler(
  async (): Promise<AgendamentoRow[]> => {
    const ctx = await contexto();
    const usuario = await ctx.usuario();
    return ctx.sql<AgendamentoRow[]>`
      SELECT * FROM public.agendamentos WHERE user_id = ${usuario.id} ORDER BY created_at DESC
    `.then((linhas) => [...linhas]);
  },
);

// Corridas atribuídas ao motorista logado — mesmo molde de vpsMinhasViagens,
// filtrando por motorista_id em vez de user_id.
export const vpsMinhasCorridas = createServerFn({ method: "GET" }).handler(
  async (): Promise<AgendamentoRow[]> => {
    const ctx = await contexto();
    const usuario = await ctx.usuario();
    return ctx.sql<AgendamentoRow[]>`
      SELECT * FROM public.agendamentos WHERE motorista_id = ${usuario.id} ORDER BY created_at DESC
    `.then((linhas) => [...linhas]);
  },
);

// Autoatendimento do motorista: só sai de "confirmado" para "concluido", e
// só a própria corrida atribuída — mesmo padrão defensivo de
// vpsCancelarMinhaViagem (filtra por dono na própria query, não só na sessão).
export const vpsConcluirCorrida = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const usuario = await ctx.usuario();
    const linhas = await ctx.sql<{ id: string }[]>`
      UPDATE public.agendamentos
         SET status = 'concluido'
       WHERE id = ${data.id}
         AND motorista_id = ${usuario.id}
         AND status = 'confirmado'
       RETURNING id
    `;
    if (!linhas[0]) {
      throw new Error("Não foi possível concluir (corrida não encontrada ou não confirmada).");
    }
    return { ok: true };
  });

// Autoatendimento: o próprio cliente cancela uma viagem dele (não exige
// admin, diferente de vpsAtualizarStatus). Só sai de pendente/confirmado —
// nunca reabre uma cancelada nem mexe em concluída — e só a própria linha,
// filtrando por user_id direto na query em vez de confiar só na sessão.
export const vpsCancelarMinhaViagem = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const usuario = await ctx.usuario();
    const linhas = await ctx.sql<{ id: string }[]>`
      UPDATE public.agendamentos
         SET status = 'cancelado'
       WHERE id = ${data.id}
         AND user_id = ${usuario.id}
         AND status IN ('pendente', 'confirmado')
       RETURNING id
    `;
    if (!linhas[0]) {
      throw new Error("Não foi possível cancelar (reserva não encontrada ou já concluída).");
    }
    return { ok: true };
  });

const reserva = z.object({
  rota_id: z.string().uuid(),
  trecho: z.string().min(1).max(200),
  data_viagem: z.string().max(20).nullable(),
  hora: z.string().max(20).nullable(),
  periodo: z.enum(["dia", "noite"]),
  carro: z.enum(["pequeno", "grande"]),
  passageiros: z.number().int().min(1).max(20),
  embarque_local: z.string().max(300).nullable(),
  observacoes: z.string().max(2000).nullable(),
  contato_nome: z.string().max(120).nullable(),
  // Sem nullable: esta é a fronteira de rede de verdade (chamável direto,
  // sem passar pelo checkout) — exigir WhatsApp aqui também, não só em
  // dados.ts, que só protege o caminho que passa pela UI.
  contato_telefone: z
    .string()
    .max(40)
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um WhatsApp válido (com DDD)."),
});

export const vpsCriarReservas = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ itens: z.array(reserva).min(1).max(20) }).parse(data))
  .handler(async ({ data }): Promise<AgendamentoRow[]> => {
    const ctx = await contexto();
    const usuario = await ctx.usuario();
    // Transação: ou todos os itens do carrinho viram agendamento, ou nenhum.
    // Sem isso, uma falha no meio do laço (ex.: uma rota foi desativada entre
    // um item e outro) deixava reservas parciais gravadas — e como o cliente
    // via a operação inteira como erro, tentar de novo duplicava as que já
    // tinham entrado. Espelha o que o insert em lote do Supabase já faz de
    // graça (uma única instrução SQL é atômica por padrão).
    const criados = await ctx.sql.begin(async (sql) => {
      const linhasCriadas: AgendamentoRow[] = [];
      for (const item of data.itens) {
        // O valor NÃO vem do cliente: o trigger agendamentos_valor_oficial calcula.
        const linhas = await sql<AgendamentoRow[]>`
          INSERT INTO public.agendamentos
            (user_id, rota_id, trecho, data_viagem, hora, periodo, carro, passageiros,
             embarque_local, observacoes, contato_nome, contato_telefone)
          VALUES (${usuario.id}, ${item.rota_id}, ${item.trecho}, ${item.data_viagem},
                  ${item.hora}, ${item.periodo}, ${item.carro}, ${item.passageiros},
                  ${item.embarque_local}, ${item.observacoes}, ${item.contato_nome},
                  ${item.contato_telefone})
          RETURNING *
        `;
        if (linhas[0]) linhasCriadas.push(linhas[0]);
      }
      return linhasCriadas;
    });

    // Fora da transação e sem await: uma falha ou lentidão criando o pedido
    // de despacho nunca pode travar nem reverter o checkout do cliente
    // aqui. Ver despacho-sync.server.ts (insert direto na mesma base desde
    // a fusão — antes disso era uma chamada HTTP pro car-fleet-co, quando
    // ainda eram dois apps separados). Import dinâmico (não top-level) pelo
    // mesmo motivo de auth.server/db.server acima: é um módulo *.server.ts,
    // só deve existir no bundle do servidor.
    void import("./despacho-sync.server").then(({ criarPedidoDespacho }) => {
      for (const agendamento of criados) {
        void criarPedidoDespacho(ctx.sql, agendamento, usuario).catch((erro: unknown) => {
          console.error("[despacho-sync] falha ao criar pedido do despacho:", erro);
        });
      }
    });

    return criados;
  });

// Aviso não-bloqueante de possível conflito de agenda (mesmo carro, mesma
// data, já reservado por outra pessoa) — ver disponibilidade.functions.ts
// pro equivalente do lado Supabase e a explicação de por que é um aviso e
// não uma trava rígida.
export const vpsContarMesmoCarroData = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ carro: z.enum(["pequeno", "grande"]), data: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }): Promise<number> => {
    const ctx = await contexto();
    await ctx.usuario(); // exige sessão, não precisa ser admin
    const linhas = await ctx.sql<{ total: string }[]>`
      SELECT count(*)::text AS total
        FROM public.agendamentos
       WHERE carro = ${data.carro}
         AND data_viagem = ${data.data}
         AND status IN ('pendente', 'confirmado')
    `;
    return Number(linhas[0]?.total ?? 0);
  });

export const vpsAtualizarStatus = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pendente", "confirmado", "concluido", "cancelado"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`UPDATE public.agendamentos SET status = ${data.status} WHERE id = ${data.id}`;
    return { ok: true };
  });

export const vpsAtribuirMotorista = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), motoristaId: z.string().uuid().nullable() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      UPDATE public.agendamentos SET motorista_id = ${data.motoristaId} WHERE id = ${data.id}
    `;
    return { ok: true };
  });

export const vpsRemoverAgendamento = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`DELETE FROM public.agendamentos WHERE id = ${data.id}`;
    return { ok: true };
  });

// -------------------------------------------------------------- conteúdo
// Sem sessão — conteudo_site é 100% público no Supabase também (GRANT
// SELECT ON conteudo_site TO anon, sem policy restritiva). Chamada por
// conteudo.functions.ts::listConteudo quando MODO_VPS — mesmo bug de
// vpsListRotasPublicas: sem isto, todo texto/imagem editado no admin não
// aparecia em lugar nenhum do site público, só o texto padrão hardcoded.
export const vpsListConteudoPublico = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConteudoBloco[]> => {
    const { sql } = await import("./db.server");
    return sql()<ConteudoBloco[]>`
      SELECT id, chave, secao, titulo, texto, imagem, ordem
        FROM public.conteudo_site ORDER BY ordem ASC
    `.then((linhas) => [...linhas]);
  },
);

export const vpsListConteudoAdmin = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConteudoBloco[]> => {
    const ctx = await contexto();
    await ctx.admin();
    return ctx.sql<ConteudoBloco[]>`
      SELECT id, chave, secao, titulo, texto, imagem, ordem
        FROM public.conteudo_site ORDER BY ordem ASC
    `.then((linhas) => [...linhas]);
  },
);

export const vpsCriarBloco = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ chave: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      INSERT INTO public.conteudo_site (chave, secao) VALUES (${data.chave}, 'geral')
    `;
    return { ok: true };
  });

const blocoEditado = z.object({
  id: z.string().uuid(),
  titulo: z.string().max(300),
  texto: z.string().max(8000),
  imagem: z.string().max(2000),
  ordem: z.number().int().min(0).max(9999),
});

export const vpsSalvarBloco = createServerFn({ method: "POST" })
  .inputValidator((data) => blocoEditado.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      UPDATE public.conteudo_site
         SET titulo = ${data.titulo}, texto = ${data.texto},
             imagem = ${data.imagem}, ordem = ${data.ordem}
       WHERE id = ${data.id}
    `;
    return { ok: true };
  });

export const vpsRemoverBloco = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`DELETE FROM public.conteudo_site WHERE id = ${data.id}`;
    return { ok: true };
  });

// ---------------------------------------------------------------- frota
const COLUNAS_VEICULO = "id, nome, modelo, passageiros, bagagem, foto, itens, ordem, ativo";

export const vpsListFrotaVeiculosAdmin = createServerFn({ method: "GET" }).handler(
  async (): Promise<VeiculoFrotaRow[]> => {
    const ctx = await contexto();
    await ctx.admin();
    return ctx.sql<VeiculoFrotaRow[]>`
      SELECT ${ctx.sql.unsafe(COLUNAS_VEICULO)} FROM public.frota_veiculos ORDER BY ordem
    `.then((linhas) => [...linhas]);
  },
);

// Sem sessão — mesmo nível de acesso público que a policy "Veículos ativos
// públicos" já dá no Supabase. Chamada por frota.functions.ts::listFrotaVeiculos.
export const vpsListFrotaVeiculosPublicos = createServerFn({ method: "GET" }).handler(
  async (): Promise<VeiculoFrotaRow[]> => {
    const { sql } = await import("./db.server");
    const db = sql();
    return db<VeiculoFrotaRow[]>`
      SELECT ${db.unsafe(COLUNAS_VEICULO)} FROM public.frota_veiculos WHERE ativo ORDER BY ordem
    `.then((linhas) => [...linhas]);
  },
);

const veiculoInput = z.object({
  nome: z.string().min(1).max(120),
  modelo: z.string().max(200).default(""),
  passageiros: z.string().max(60).default(""),
  bagagem: z.string().max(120).default(""),
  foto: z.string().max(2000).default(""),
  itens: z.array(z.string().max(200)).max(20).default([]),
  ordem: z.number().int().min(0).max(9999).default(0),
});

export const vpsCriarVeiculoFrota = createServerFn({ method: "POST" })
  .inputValidator((data) => veiculoInput.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      INSERT INTO public.frota_veiculos (nome, modelo, passageiros, bagagem, foto, itens, ordem)
      VALUES (${data.nome}, ${data.modelo}, ${data.passageiros}, ${data.bagagem}, ${data.foto},
              ${data.itens}, ${data.ordem})
    `;
    return { ok: true };
  });

export const vpsSalvarVeiculoFrota = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    veiculoInput.extend({ id: z.string().uuid(), ativo: z.boolean() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      UPDATE public.frota_veiculos
         SET nome = ${data.nome}, modelo = ${data.modelo}, passageiros = ${data.passageiros},
             bagagem = ${data.bagagem}, foto = ${data.foto}, itens = ${data.itens},
             ordem = ${data.ordem}, ativo = ${data.ativo}
       WHERE id = ${data.id}
    `;
    return { ok: true };
  });

export const vpsRemoverVeiculoFrota = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`DELETE FROM public.frota_veiculos WHERE id = ${data.id}`;
    return { ok: true };
  });

export const vpsListFrotaGaleriaAdmin = createServerFn({ method: "GET" }).handler(
  async (): Promise<FotoGaleriaRow[]> => {
    const ctx = await contexto();
    await ctx.admin();
    return ctx.sql<FotoGaleriaRow[]>`
      SELECT id, foto, alt, ordem, ativo FROM public.frota_galeria ORDER BY ordem
    `.then((linhas) => [...linhas]);
  },
);

// Sem sessão — equivalente público. Chamada por frota.functions.ts::listFrotaGaleria.
export const vpsListFrotaGaleriaPublica = createServerFn({ method: "GET" }).handler(
  async (): Promise<FotoGaleriaRow[]> => {
    const { sql } = await import("./db.server");
    return sql()<FotoGaleriaRow[]>`
      SELECT id, foto, alt, ordem, ativo FROM public.frota_galeria WHERE ativo ORDER BY ordem
    `.then((linhas) => [...linhas]);
  },
);

const fotoGaleriaInput = z.object({
  foto: z.string().min(1).max(2000),
  alt: z.string().max(300).default(""),
  ordem: z.number().int().min(0).max(9999).default(0),
});

export const vpsCriarFotoGaleria = createServerFn({ method: "POST" })
  .inputValidator((data) => fotoGaleriaInput.parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      INSERT INTO public.frota_galeria (foto, alt, ordem) VALUES (${data.foto}, ${data.alt}, ${data.ordem})
    `;
    return { ok: true };
  });

export const vpsSalvarFotoGaleria = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    fotoGaleriaInput.extend({ id: z.string().uuid(), ativo: z.boolean() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`
      UPDATE public.frota_galeria
         SET foto = ${data.foto}, alt = ${data.alt}, ordem = ${data.ordem}, ativo = ${data.ativo}
       WHERE id = ${data.id}
    `;
    return { ok: true };
  });

export const vpsRemoverFotoGaleria = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    await ctx.admin();
    await ctx.sql`DELETE FROM public.frota_galeria WHERE id = ${data.id}`;
    return { ok: true };
  });

// ------------------------------------------------------ usuários e acessos
export const vpsListUsuarios = createServerFn({ method: "GET" }).handler(
  async (): Promise<UsuarioAdmin[]> => {
    const ctx = await contexto();
    await ctx.admin();
    const linhas = await ctx.sql<
      {
        id: string;
        email: string;
        nome: string;
        telefone: string;
        criadoEm: string;
        ultimoAcesso: string | null;
        admin: boolean;
        motorista: boolean;
        agendamentos: string;
      }[]
    >`
      SELECT u.id, u.email, u.nome, u.telefone,
             u.created_at AS "criadoEm", u.ultimo_acesso AS "ultimoAcesso", u.admin, u.motorista,
             count(a.id) AS agendamentos
        FROM public.usuarios u
        LEFT JOIN public.agendamentos a ON a.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC
    `;
    return linhas.map((l) => ({
      id: l.id,
      email: l.email,
      nome: l.nome,
      telefone: l.telefone,
      criadoEm: l.criadoEm,
      ultimoAcesso: l.ultimoAcesso,
      confirmado: true, // não há confirmação por e-mail no deploy próprio
      isAdmin: l.admin,
      isMotorista: l.motorista,
      agendamentos: Number(l.agendamentos),
    }));
  },
);

export const vpsDefinirAdmin = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(data))
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const atual = await ctx.admin();
    if (atual.id === data.userId && !data.admin) {
      throw new Error("Você não pode remover seu próprio acesso de administrador.");
    }
    await ctx.sql`UPDATE public.usuarios SET admin = ${data.admin} WHERE id = ${data.userId}`;
    registrarAuditoria({
      acao: data.admin ? "promover_admin" : "remover_admin",
      atorId: atual.id,
      atorEmail: atual.email,
      alvoId: data.userId,
    });
    return { ok: true };
  });

export const vpsDefinirMotorista = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ userId: z.string().uuid(), motorista: z.boolean() }).parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const atual = await ctx.admin();
    await ctx.sql`UPDATE public.usuarios SET motorista = ${data.motorista} WHERE id = ${data.userId}`;
    registrarAuditoria({
      acao: data.motorista ? "promover_motorista" : "remover_motorista",
      atorId: atual.id,
      atorEmail: atual.email,
      alvoId: data.userId,
    });
    return { ok: true };
  });

export const vpsRedefinirSenha = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        userId: z.string().uuid(),
        senha: z.string().max(72).refine(senhaForte, SENHA_REGRA_TEXTO),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const ctx = await contexto();
    const admin = await ctx.admin();
    const { hashSenha } = await import("./auth.server");
    const hash = await hashSenha(data.senha);
    await ctx.sql`UPDATE public.usuarios SET senha_hash = ${hash} WHERE id = ${data.userId}`;
    // Sessões antigas caem: quem teve a senha trocada precisa entrar de novo.
    await ctx.sql`DELETE FROM public.sessoes WHERE user_id = ${data.userId}`;
    registrarAuditoria({
      acao: "redefinir_senha",
      atorId: admin.id,
      atorEmail: admin.email,
      alvoId: data.userId,
    });
    return { ok: true };
  });
