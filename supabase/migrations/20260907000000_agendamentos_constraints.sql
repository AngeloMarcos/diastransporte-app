-- Equivalente Supabase de db/migrations/0004_constraints.sql — ver aquele
-- arquivo para a explicação completa. Reforça no banco validações que hoje
-- só existem em TypeScript ou dentro do trigger agendamentos_calcular_valor
-- (que só valida periodo/carro quando essas colunas específicas são
-- tocadas, não em qualquer escrita — um UPDATE só de `status`, por exemplo,
-- nunca passa por ele).
--
-- ⚠️ NÃO aplicado automaticamente por esta sessão: sem conexão MCP ativa
-- com o projeto Supabase certo (apontando para outro projeto — ver
-- CLAUDE.md/histórico), não há como rodar isto contra o banco de produção
-- nem confirmar antes que nenhuma linha existente viola as constraints
-- abaixo. Antes de aplicar (SQL Editor do Supabase, ou reconectando o MCP),
-- rode esta checagem primeiro — qualquer contagem > 0 tem que ser corrigida
-- (ou a constraint ajustada) antes do ALTER TABLE, senão ele falha:
--
--   SELECT
--     (SELECT count(*) FROM agendamentos WHERE status NOT IN ('pendente','confirmado','concluido','cancelado')) AS status_invalido,
--     (SELECT count(*) FROM agendamentos WHERE periodo NOT IN ('dia','noite')) AS periodo_invalido,
--     (SELECT count(*) FROM agendamentos WHERE carro NOT IN ('pequeno','grande')) AS carro_invalido,
--     (SELECT count(*) FROM agendamentos WHERE passageiros < 1 OR passageiros > 20) AS passageiros_fora,
--     (SELECT count(*) FROM agendamentos WHERE length(trecho) NOT BETWEEN 1 AND 200) AS trecho_fora,
--     (SELECT count(*) FROM agendamentos WHERE length(coalesce(embarque_local,'')) > 300) AS embarque_grande,
--     (SELECT count(*) FROM agendamentos WHERE length(coalesce(observacoes,'')) > 2000) AS obs_grande,
--     (SELECT count(*) FROM agendamentos WHERE length(coalesce(contato_nome,'')) > 120) AS nome_grande,
--     (SELECT count(*) FROM agendamentos WHERE length(coalesce(contato_telefone,'')) > 40) AS tel_grande,
--     (SELECT count(*) FROM rotas WHERE preco_pequeno < 0 OR preco_grande < 0 OR preco_pequeno_noite < 0 OR preco_grande_noite < 0) AS preco_negativo;

ALTER TABLE public.agendamentos
  ADD CONSTRAINT ck_agendamentos_status
    CHECK (status IN ('pendente', 'confirmado', 'concluido', 'cancelado')),
  ADD CONSTRAINT ck_agendamentos_periodo
    CHECK (periodo IN ('dia', 'noite')),
  ADD CONSTRAINT ck_agendamentos_carro
    CHECK (carro IN ('pequeno', 'grande')),
  ADD CONSTRAINT ck_agendamentos_passageiros
    CHECK (passageiros BETWEEN 1 AND 20),
  ADD CONSTRAINT ck_agendamentos_textos
    CHECK (
      length(trecho) BETWEEN 1 AND 200
      AND (embarque_local IS NULL OR length(embarque_local) <= 300)
      AND (observacoes IS NULL OR length(observacoes) <= 2000)
      AND (contato_nome IS NULL OR length(contato_nome) <= 120)
      AND (contato_telefone IS NULL OR length(contato_telefone) <= 40)
    );

ALTER TABLE public.rotas
  ADD CONSTRAINT ck_rotas_precos_nao_negativos
    CHECK (
      preco_pequeno >= 0
      AND (preco_grande IS NULL OR preco_grande >= 0)
      AND (preco_pequeno_noite IS NULL OR preco_pequeno_noite >= 0)
      AND (preco_grande_noite IS NULL OR preco_grande_noite >= 0)
    );

CREATE INDEX IF NOT EXISTS agendamentos_carro_data_idx
  ON public.agendamentos (carro, data_viagem);
