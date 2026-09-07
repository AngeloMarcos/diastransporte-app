-- Role de aplicação (CRUD apenas) — separada da role de migration (DDL).
-- Mesmo formato do projeto irmão Dias Transporte (já testado em produção lá,
-- incluindo a correção do bug de interpolação do psql abaixo).
-- Aplique com a role de migration, informando a senha:
--   psql "$DATABASE_URL_MIGRATION" -v app_password="senha-forte-aqui" -f db/migrations/0002_roles.sql
-- Depois use no runtime: DATABASE_URL=postgres://carfleet_app:senha@host:5432/carfleet

BEGIN;

SET app.password TO :'app_password';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'carfleet_app') THEN
    EXECUTE format('CREATE ROLE carfleet_app LOGIN PASSWORD %L', current_setting('app.password'));
  ELSE
    EXECUTE format('ALTER ROLE carfleet_app LOGIN PASSWORD %L', current_setting('app.password'));
  END IF;
END;
$$;

RESET app.password;

GRANT USAGE ON SCHEMA public TO carfleet_app;

-- CRUD nas tabelas de dados; nenhuma permissão de DDL.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.usuarios, public.sessoes, public.categorias_veiculo, public.empresas_clientes,
  public.canais_venda, public.fornecedores, public.fornecedores_notas_internas,
  public.pedidos, public.pedidos_notas_internas, public.pedidos_historico
TO carfleet_app;

GRANT USAGE, SELECT ON SEQUENCE public.pedidos_id_seq TO carfleet_app;

-- Tabelas futuras criadas pela role de migration já nascem acessíveis ao app.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO carfleet_app;

-- Sem permissão de criar objetos no schema.
REVOKE CREATE ON SCHEMA public FROM carfleet_app;

COMMIT;
