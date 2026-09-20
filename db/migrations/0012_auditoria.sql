-- Trilha de auditoria de verdade (quem mudou o quê e quando). Substitui o
-- registro "interino" em log de src/lib/auditoria.ts (commit 6bdc222), que
-- só deixava rastro em `docker compose logs` — sumia com a rotação do log e
-- não dava pra consultar pelo painel.
--
-- Decisões de desenho:
--  * usuario_id SEM foreign key, com usuario_email copiado junto: a
--    trilha tem que sobreviver à exclusão da conta de quem agiu (todas as
--    outras FKs para usuarios são ON DELETE SET NULL, o que apagaria
--    justamente a informação de "quem" — ver pedidos_historico.alterado_por).
--  * append-only no nível do banco: a role da aplicação (dias_app) só recebe
--    INSERT e SELECT. Nem um bug na aplicação nem um SQL injection consegue
--    reescrever ou apagar o histórico.
--  * antes/depois guardam só os campos que mudaram (jsonb), não a linha toda.

CREATE TABLE IF NOT EXISTS public.auditoria (
  id            bigserial PRIMARY KEY,
  quando        timestamptz NOT NULL DEFAULT now(),
  usuario_id    uuid,
  usuario_email text NOT NULL DEFAULT '',
  acao          text NOT NULL,
  entidade      text NOT NULL,
  entidade_id   text,
  resumo        text NOT NULL DEFAULT '',
  antes         jsonb,
  depois        jsonb,
  CONSTRAINT ck_auditoria_textos CHECK (
    length(acao) BETWEEN 1 AND 60
    AND length(entidade) BETWEEN 1 AND 60
    AND length(usuario_email) <= 254
    AND length(resumo) <= 500
    AND (entidade_id IS NULL OR length(entidade_id) <= 80)
  )
);

CREATE INDEX IF NOT EXISTS ix_auditoria_quando ON public.auditoria (quando DESC);
CREATE INDEX IF NOT EXISTS ix_auditoria_entidade ON public.auditoria (entidade, entidade_id);
CREATE INDEX IF NOT EXISTS ix_auditoria_usuario ON public.auditoria (usuario_id);

-- Mesmo achado de 0009_carfleet_grants.sql: ALTER DEFAULT PRIVILEGES cobre
-- tabelas, não sequences — sem isto todo INSERT falharia com "permission
-- denied for sequence auditoria_id_seq".
GRANT USAGE, SELECT ON SEQUENCE public.auditoria_id_seq TO dias_app;
REVOKE UPDATE, DELETE, TRUNCATE ON public.auditoria FROM dias_app;

-- Achado revisando o schema: três chaves estrangeiras sem índice. Sem ele,
-- apagar uma categoria de veículo (ON DELETE SET NULL) ou uma conta de
-- usuário varre pedidos/pedidos_historico/fornecedores inteiros.
CREATE INDEX IF NOT EXISTS ix_fornecedores_categoria ON public.fornecedores (categoria_veiculo_id);
CREATE INDEX IF NOT EXISTS ix_pedidos_categoria ON public.pedidos (categoria_veiculo_id);
CREATE INDEX IF NOT EXISTS ix_pedidos_historico_alterado_por ON public.pedidos_historico (alterado_por);
