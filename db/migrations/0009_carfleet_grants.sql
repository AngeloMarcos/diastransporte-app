-- Etapa 4 do roteiro de fusão — complemento de 0007/0008. Achado revisando
-- 0002_roles.sql: "ALTER DEFAULT PRIVILEGES ... ON TABLES" já cobre as
-- tabelas novas automaticamente pra dias_app, mas NÃO cobre sequences — e
-- pedidos.id é o primeiro bigserial neste schema (todo o resto usa uuid
-- gen_random_uuid(), que não precisa de sequence nenhuma). Sem este GRANT,
-- todo INSERT em pedidos falharia em runtime com "permission denied for
-- sequence pedidos_id_seq" mesmo com o INSERT na tabela já liberado.
-- Mesmo GRANT que o car-fleet-co já tinha pro equivalente dele (carfleet_app).

BEGIN;

GRANT USAGE, SELECT ON SEQUENCE public.pedidos_id_seq TO dias_app;

COMMIT;
