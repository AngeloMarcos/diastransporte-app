#!/usr/bin/env node
// Etapa 5 do roteiro de fusão (linear-rolling-marble.md): carga pontual dos
// dados reais do car-fleet-co pro banco único do app fundido — NÃO um
// pg_dump/pg_restore genérico (arrastaria lixo de teste e colidiria em
// objetos com nome igual nos dois bancos, como set_updated_at() e
// usuarios/sessoes, que agora são a MESMA tabela, não duas).
//
// Uso:
//   DATABASE_URL_DIAS=postgres://... DATABASE_URL_CARFLEET=postgres://... \
//     node db/one-off/importar-dados-carfleet.mjs [--dry-run]
//
// --dry-run: só imprime o que faria, não escreve nada (use primeiro,
// sempre, antes de rodar de verdade — e novamente antes de rodar contra
// produção, mesmo já tendo rodado contra um banco de teste).
//
// Idempotência: seguro rodar mais de uma vez. Usuários são casados por
// e-mail (nunca duplica); categorias/empresas/canais/fornecedores só
// entram se ainda não existir uma linha com o mesmo nome/e-mail natural
// (ON CONFLICT DO NOTHING nos únicos existentes, ou checagem manual onde
// não há unique constraint pelo campo natural).
import postgres from "postgres";

const dryRun = process.argv.includes("--dry-run");

const urlDias = process.env.DATABASE_URL_DIAS;
const urlCarfleet = process.env.DATABASE_URL_CARFLEET;
if (!urlDias || !urlCarfleet) {
  console.error("Defina DATABASE_URL_DIAS e DATABASE_URL_CARFLEET.");
  process.exit(1);
}

const dias = postgres(urlDias, { max: 1, onnotice: () => {} });
const carfleet = postgres(urlCarfleet, { max: 1, onnotice: () => {} });

const resumo = {
  usuarios_fundidos: 0,
  usuarios_inseridos: 0,
  categorias: 0,
  empresas: 0,
  canais: 0,
  fornecedores: 0,
  pedidos: 0,
};

try {
  // ------------------------------------------------------------- usuários
  // Casa por e-mail (case-insensitive, mesma regra do índice único de
  // usuarios_email_idx nos dois bancos). Nunca duplica; nunca REBAIXA um
  // admin/motorista já true no lado dias — só faz OR.
  const usuariosCarfleet = await carfleet`
    SELECT id, email, senha_hash, nome, telefone, admin, motorista FROM public.usuarios
  `;
  /** @type {Map<string, string>} carfleet user id -> dias user id */
  const mapaUsuarios = new Map();

  for (const u of usuariosCarfleet) {
    const [existente] = await dias`
      SELECT id, admin, motorista FROM public.usuarios WHERE lower(email) = lower(${u.email})
    `;
    if (existente) {
      mapaUsuarios.set(u.id, existente.id);
      const novoAdmin = existente.admin || u.admin;
      const novoMotorista = existente.motorista || u.motorista;
      const mudou = novoAdmin !== existente.admin || novoMotorista !== existente.motorista;
      console.log(
        `usuario ${u.email}: já existe em dias (id ${existente.id})` +
          (mudou
            ? ` — atualizando admin/motorista para ${novoAdmin}/${novoMotorista}`
            : " — sem mudança"),
      );
      if (!dryRun && mudou) {
        await dias`
          UPDATE public.usuarios SET admin = ${novoAdmin}, motorista = ${novoMotorista}
          WHERE id = ${existente.id}
        `;
      }
      if (mudou) resumo.usuarios_fundidos++;
    } else {
      console.log(
        `usuario ${u.email}: não existe em dias — inserindo com o hash bcrypt já existente`,
      );
      if (!dryRun) {
        const [criado] = await dias`
          INSERT INTO public.usuarios (email, senha_hash, nome, telefone, admin, motorista)
          VALUES (${u.email}, ${u.senha_hash}, ${u.nome}, ${u.telefone}, ${u.admin}, ${u.motorista})
          RETURNING id
        `;
        mapaUsuarios.set(u.id, criado.id);
      }
      resumo.usuarios_inseridos++;
    }
  }

  // ------------------------------------------------- categorias_veiculo
  const categorias =
    await carfleet`SELECT nome, capacidade_passageiros, ativo FROM public.categorias_veiculo`;
  for (const c of categorias) {
    const [existe] =
      await dias`SELECT id FROM public.categorias_veiculo WHERE lower(nome) = lower(${c.nome})`;
    if (existe) {
      console.log(`categoria "${c.nome}": já existe em dias — pulando`);
      continue;
    }
    console.log(`categoria "${c.nome}": inserindo`);
    if (!dryRun) {
      await dias`
        INSERT INTO public.categorias_veiculo (nome, capacidade_passageiros, ativo)
        VALUES (${c.nome}, ${c.capacidade_passageiros}, ${c.ativo})
      `;
    }
    resumo.categorias++;
  }

  // ------------------------------------------------- empresas_clientes
  const empresas = await carfleet`
    SELECT nome, documento, email_contato, telefone_contato, ativo FROM public.empresas_clientes
  `;
  for (const e of empresas) {
    console.log(`empresa "${e.nome}": inserindo`);
    if (!dryRun) {
      await dias`
        INSERT INTO public.empresas_clientes (nome, documento, email_contato, telefone_contato, ativo)
        VALUES (${e.nome}, ${e.documento}, ${e.email_contato}, ${e.telefone_contato}, ${e.ativo})
      `;
    }
    resumo.empresas++;
  }

  // ------------------------------------------------------- canais_venda
  const canais = await carfleet`SELECT nome, tipo, ativo FROM public.canais_venda`;
  for (const c of canais) {
    const [existe] =
      await dias`SELECT id FROM public.canais_venda WHERE lower(nome) = lower(${c.nome})`;
    if (existe) {
      console.log(`canal "${c.nome}": já existe em dias — pulando`);
      continue;
    }
    console.log(`canal "${c.nome}": inserindo`);
    if (!dryRun) {
      await dias`INSERT INTO public.canais_venda (nome, tipo, ativo) VALUES (${c.nome}, ${c.tipo}, ${c.ativo})`;
    }
    resumo.canais++;
  }

  // -------------------------------------------------------- fornecedores
  // Remapeia user_id pelo mapa de e-mails montado acima; categoria/empresa
  // são casadas pelo nome (já inseridas acima nesta mesma execução).
  const fornecedores = await carfleet`
    SELECT f.user_id, f.nome, f.telefone, f.email, f.cidade_atuacao, f.regiao_atuacao, f.ativo,
           cv.nome AS categoria_nome
      FROM public.fornecedores f
      LEFT JOIN public.categorias_veiculo cv ON cv.id = f.categoria_veiculo_id
  `;
  for (const f of fornecedores) {
    const userIdNovo = f.user_id ? (mapaUsuarios.get(f.user_id) ?? null) : null;
    let categoriaIdNova = null;
    if (f.categoria_nome) {
      const [cat] =
        await dias`SELECT id FROM public.categorias_veiculo WHERE lower(nome) = lower(${f.categoria_nome})`;
      categoriaIdNova = cat?.id ?? null;
    }
    console.log(`fornecedor "${f.nome}": inserindo (user_id remapeado: ${userIdNovo ?? "nenhum"})`);
    if (!dryRun) {
      await dias`
        INSERT INTO public.fornecedores
          (user_id, nome, telefone, email, cidade_atuacao, regiao_atuacao, categoria_veiculo_id, ativo)
        VALUES (${userIdNovo}, ${f.nome}, ${f.telefone}, ${f.email}, ${f.cidade_atuacao},
                ${f.regiao_atuacao}, ${categoriaIdNova}, ${f.ativo})
      `;
    }
    resumo.fornecedores++;
  }

  // ------------------------------------------------------------- pedidos
  // Só copia se existir alguma linha real na hora de rodar — checagem
  // fresca, não confia num número visto antes.
  const [{ total: totalPedidos }] =
    await carfleet`SELECT count(*)::int AS total FROM public.pedidos`;
  if (totalPedidos > 0) {
    console.warn(
      `ATENÇÃO: ${totalPedidos} pedido(s) real(is) encontrado(s) no car-fleet-co — ` +
        "este script não copia pedidos automaticamente (esperado ser 0). Pare e decida " +
        "manualmente antes de continuar; rodar de novo sem tratar isso não vai copiá-los.",
    );
  } else {
    console.log("pedidos: 0 linhas no car-fleet-co, nada a copiar (esperado)");
  }

  console.log("\nResumo:", resumo);
  if (dryRun) console.log("\n(--dry-run: nada foi escrito)");
} finally {
  await dias.end();
  await carfleet.end();
}
