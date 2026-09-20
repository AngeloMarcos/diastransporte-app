// Leads do formulário de contato (public.leads, migration 0017). Só em modo
// VPS. `criarLead` é PÚBLICO (visitante sem login) — por isso tem isca
// anti-robô, limite de envios por hora e nunca devolve nada além de "ok".
// Listar/atualizar exigem admin (sem RLS aqui, a checagem é em TypeScript).
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { diferencaCampos, semMudancas } from "@/lib/auditoria";
import { LEAD_STATUS, mensagemAvisoLead, novoLeadSchema, type LeadRow } from "@/lib/leads";

/** Máximo de pedidos por origem (IP) e no site todo, por hora. Passou disso, a
 * resposta continua "ok" mas o lead não é gravado — quem ataca não aprende o
 * limite, e uma pessoa de verdade dificilmente manda mais que isso. */
const LIMITE_POR_IP_HORA = 5;
const LIMITE_GLOBAL_HORA = 60;

/** IP de quem chamou, só pra limitar abuso. Atrás do proxy (Caddy) vem em
 * x-forwarded-for; no staging direto na porta o cabeçalho pode faltar. */
function ipDoPedido(): string {
  const xff = getRequestHeader("x-forwarded-for");
  const primeiro = xff?.split(",")[0]?.trim();
  return primeiro || getRequestHeader("x-real-ip") || "desconhecido";
}

export const vpsCriarLead = createServerFn({ method: "POST" })
  .inputValidator((data) => novoLeadSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    // Robô que preencheu a isca: finge sucesso e descarta.
    if (data.website) return { ok: true };

    const [{ sql }, { createHmac }] = await Promise.all([
      import("./db.server"),
      import("node:crypto"),
    ]);
    const db = sql();
    // HMAC com o segredo do app: o hash não dá pra reverter em IP por força
    // bruta (o espaço de IPv4 é pequeno demais pra um hash simples).
    const ipHash = createHmac("sha256", process.env["SESSION_SECRET"] ?? "")
      .update(ipDoPedido())
      .digest("hex");

    const [uso] = await db<{ do_ip: number; total: number }[]>`
      SELECT count(*) FILTER (WHERE ip_hash = ${ipHash})::int AS do_ip, count(*)::int AS total
        FROM public.leads
       WHERE created_at > now() - interval '1 hour'
    `;
    if (uso && (uso.do_ip >= LIMITE_POR_IP_HORA || uso.total >= LIMITE_GLOBAL_HORA)) {
      console.warn(JSON.stringify({ tipo: "lead_limite", do_ip: uso.do_ip, total: uso.total }));
      return { ok: true };
    }

    const [lead] = await db<{ id: string }[]>`
      INSERT INTO public.leads (nome, telefone, trecho, data_viagem, observacoes, ip_hash)
      VALUES (${data.nome}, ${data.telefone}, ${data.trecho ?? null},
              ${data.dataViagem ?? null}, ${data.observacoes ?? null}, ${ipHash})
      RETURNING id
    `;

    // Aviso ao dono, sem travar a resposta ao visitante: o lead já está salvo.
    if (lead) void avisarDono(lead.id, data);
    return { ok: true };
  });

/** Webhook opcional (n8n etc.): LEADS_WEBHOOK_URL (+ LEADS_WEBHOOK_SECRET, mandado
 * no cabeçalho x-webhook-secret). Sem a variável, não faz nada — a aba "Leads"
 * do admin continua sendo a fonte da verdade. Falha vira log, nunca erro pro
 * visitante. */
async function avisarDono(id: string, lead: z.output<typeof novoLeadSchema>): Promise<void> {
  const url = process.env["LEADS_WEBHOOK_URL"];
  if (!url) return;
  try {
    const segredo = process.env["LEADS_WEBHOOK_SECRET"];
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(segredo ? { "x-webhook-secret": segredo } : {}),
      },
      body: JSON.stringify({
        tipo: "novo_lead",
        id,
        mensagem: mensagemAvisoLead(lead),
        lead: {
          nome: lead.nome,
          telefone: lead.telefone,
          trecho: lead.trecho ?? null,
          dataViagem: lead.dataViagem ?? null,
          observacoes: lead.observacoes ?? null,
        },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!resposta.ok) throw new Error(`webhook respondeu ${String(resposta.status)}`);
    const { sql } = await import("./db.server");
    await sql()`UPDATE public.leads SET notificado_em = now() WHERE id = ${id}`;
  } catch (erro) {
    console.error(
      JSON.stringify({
        tipo: "lead_aviso_falhou",
        id,
        erro: erro instanceof Error ? erro.message : String(erro),
      }),
    );
  }
}

async function exigirAdminLeads() {
  const [{ lerCookieSessao, exigirAdmin }, { sql }] = await Promise.all([
    import("./auth.server"),
    import("./db.server"),
  ]);
  const admin = await exigirAdmin(lerCookieSessao(getRequestHeader("cookie") ?? null));
  return { admin, sql: sql() };
}

const filtroLeads = z.object({
  status: z.enum(LEAD_STATUS).optional(),
  busca: z.string().trim().max(100).optional(),
});

export const vpsListarLeads = createServerFn({ method: "GET" })
  .inputValidator((data) => filtroLeads.parse(data ?? {}))
  .handler(async ({ data }): Promise<LeadRow[]> => {
    const { sql } = await exigirAdminLeads();
    let cond = sql`TRUE`;
    if (data.status) cond = sql`${cond} AND status = ${data.status}`;
    if (data.busca) {
      const termo = "%" + data.busca + "%";
      cond = sql`${cond} AND (nome ILIKE ${termo} OR telefone ILIKE ${termo} OR trecho ILIKE ${termo})`;
    }
    return sql<LeadRow[]>`
      SELECT id, nome, telefone, trecho, data_viagem::text AS data_viagem, observacoes, origem,
             status, nota_interna, notificado_em, created_at
        FROM public.leads
       WHERE ${cond}
       ORDER BY created_at DESC
       LIMIT 300
    `.then((linhas) => [...linhas]);
  });

export const vpsAtualizarLead = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(LEAD_STATUS).optional(),
        notaInterna: z.string().trim().max(1000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { admin, sql } = await exigirAdminLeads();
    const [antes] = await sql<{ nome: string; status: string; nota_interna: string | null }[]>`
      SELECT nome, status, nota_interna FROM public.leads WHERE id = ${data.id}
    `;
    if (!antes) throw new Error("Lead não encontrado.");

    const novoStatus = data.status ?? antes.status;
    const novaNota = data.notaInterna === undefined ? antes.nota_interna : data.notaInterna || null;
    await sql`
      UPDATE public.leads SET status = ${novoStatus}, nota_interna = ${novaNota}
       WHERE id = ${data.id}
    `;

    const diff = diferencaCampos(
      { status: antes.status, nota_interna: antes.nota_interna },
      { status: novoStatus, nota_interna: novaNota },
      ["status", "nota_interna"],
    );
    if (!semMudancas(diff)) {
      const { gravarAuditoria } = await import("./auditoria.server");
      await gravarAuditoria(
        { id: admin.id, email: admin.email },
        {
          acao: data.status && data.status !== antes.status ? "status" : "editar",
          entidade: "lead",
          entidadeId: data.id,
          resumo: `Lead ${antes.nome}: alterou ${Object.keys(diff.antes).join(", ")}`,
          ...diff,
        },
      );
    }
    return { ok: true };
  });
