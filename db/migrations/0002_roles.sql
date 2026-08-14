-- Role de aplicação (CRUD apenas) — separada da role de migration (DDL).
-- Aplique com a role de migration, informando a senha:
--   psql "$DATABASE_URL_MIGRATION" -v app_password="'senha-forte-aqui'" -f db/migrations/0002_roles.sql
-- Depois use no runtime: DATABASE_URL=postgres://dias_app:senha@host:5432/dias

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dias_app') THEN
    EXECUTE format('CREATE ROLE dias_app LOGIN PASSWORD %L', :app_password);
  ELSE
    EXECUTE format('ALTER ROLE dias_app LOGIN PASSWORD %L', :app_password);
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO dias_app;

-- CRUD nas tabelas de dados; nenhuma permissão de DDL.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.usuarios, public.sessoes, public.rotas, public.conteudo_site, public.agendamentos
TO dias_app;

GRANT SELECT ON public.profiles TO dias_app;

-- Tabelas futuras criadas pela role de migration já nascem acessíveis ao app.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dias_app;

-- Sem permissão de criar objetos no schema.
REVOKE CREATE ON SCHEMA public FROM dias_app;

COMMIT;
