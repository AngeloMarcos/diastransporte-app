-- Etapa 4 do roteiro de fusão (C:\Users\angel\.claude\plans\linear-rolling-marble.md):
-- schema de despacho do car-fleet-co, portado pra dentro do banco único do
-- app fundido. Fonte: car-fleet-co/db/migrations/0001_init.sql — aqui SEM
-- os pedaços de usuarios/sessoes/set_updated_at, que já existem desde
-- 0001_init.sql deste projeto (mesma tabela, não duplicada). pgcrypto
-- também já foi habilitada lá.
--
-- Sem RLS/policy/GRANT de PostgREST, sem SECURITY DEFINER pra regra de
-- negócio (fn_transicionar_status, fn_atribuir_motorista e os guards do
-- car-fleet-co viram lógica comum em TypeScript, não SQL — só o servidor
-- Node fala com este Postgres). Só ficam como trigger SQL as coisas sem
-- dependência de identidade: timestamps e normalização de texto, portadas
-- verbatim.


-- --------------------------------------------------------------------- enums
CREATE TYPE public.pedido_direcao AS ENUM ('IN', 'OUT');

CREATE TYPE public.pedido_status AS ENUM (
  'pendente_liberacao',
  'venda_cancelada',
  'liberada_rede',
  'motorista_atribuido',
  'aguardando_aceite_rede',
  'aceita_motorista',
  'em_atendimento',
  'corrida_finalizada',
  'no_show_driver',
  'no_show_pax'
);

-- ---------------------------------------------------------- categorias_veiculo
CREATE TABLE IF NOT EXISTS public.categorias_veiculo (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                   text NOT NULL UNIQUE,
  capacidade_passageiros int,
  ativo                  boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_categorias_capacidade CHECK (capacidade_passageiros IS NULL OR capacidade_passageiros > 0)
);

DROP TRIGGER IF EXISTS trg_cat_veiculo_updated ON public.categorias_veiculo;
CREATE TRIGGER trg_cat_veiculo_updated BEFORE UPDATE ON public.categorias_veiculo
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------- empresas_clientes
CREATE TABLE IF NOT EXISTS public.empresas_clientes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text NOT NULL,
  documento        text,
  email_contato    text,
  telefone_contato text,
  ativo            boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_empresas_nome CHECK (length(nome) BETWEEN 2 AND 200),
  CONSTRAINT ck_empresas_email CHECK (email_contato IS NULL OR email_contato ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT ck_empresas_telefone CHECK (telefone_contato IS NULL OR length(telefone_contato) <= 120)
);

DROP TRIGGER IF EXISTS trg_empresas_updated ON public.empresas_clientes;
CREATE TRIGGER trg_empresas_updated BEFORE UPDATE ON public.empresas_clientes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.empresas_normalizar()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.nome := btrim(NEW.nome);
  NEW.documento := NULLIF(btrim(NEW.documento), '');
  NEW.email_contato := NULLIF(lower(btrim(NEW.email_contato)), '');
  NEW.telefone_contato := NULLIF(btrim(NEW.telefone_contato), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresas_normalizar ON public.empresas_clientes;
CREATE TRIGGER trg_empresas_normalizar BEFORE INSERT OR UPDATE ON public.empresas_clientes
FOR EACH ROW EXECUTE FUNCTION public.empresas_normalizar();

-- --------------------------------------------------------------- canais_venda
CREATE TABLE IF NOT EXISTS public.canais_venda (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL UNIQUE,
  tipo       text NOT NULL CHECK (tipo IN ('ota', 'site_proprio', 'parceiro', 'outro')),
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_canais_updated ON public.canais_venda;
CREATE TRIGGER trg_canais_updated BEFORE UPDATE ON public.canais_venda
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------- fornecedores
-- (motoristas) — user_id referencia a MESMA tabela usuarios que a vitrine
-- pública já usa (cliente e motorista/admin compartilham o cadastro).
CREATE TABLE IF NOT EXISTS public.fornecedores (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid UNIQUE REFERENCES public.usuarios (id) ON DELETE SET NULL,
  nome                 text NOT NULL,
  telefone             text,
  email                text,
  cidade_atuacao       text NOT NULL,
  regiao_atuacao       text,
  categoria_veiculo_id uuid REFERENCES public.categorias_veiculo (id) ON DELETE SET NULL,
  ativo                boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_fornecedores_nome CHECK (length(nome) BETWEEN 2 AND 200),
  CONSTRAINT ck_fornecedores_email CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT ck_fornecedores_telefone CHECK (telefone IS NULL OR length(telefone) <= 120)
);

DROP TRIGGER IF EXISTS trg_fornecedores_updated ON public.fornecedores;
CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.fornecedores_normalizar()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.nome := btrim(NEW.nome);
  NEW.cidade_atuacao := btrim(NEW.cidade_atuacao);
  NEW.email := NULLIF(lower(btrim(NEW.email)), '');
  NEW.telefone := NULLIF(btrim(NEW.telefone), '');
  NEW.regiao_atuacao := NULLIF(btrim(NEW.regiao_atuacao), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fornecedores_normalizar ON public.fornecedores;
CREATE TRIGGER trg_fornecedores_normalizar BEFORE INSERT OR UPDATE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.fornecedores_normalizar();

CREATE INDEX IF NOT EXISTS ix_fornecedores_cidade ON public.fornecedores (lower(cidade_atuacao));
CREATE INDEX IF NOT EXISTS ix_fornecedores_user_id ON public.fornecedores (user_id);

-- ------------------------------------------------------ fornecedores_notas_internas
CREATE TABLE IF NOT EXISTS public.fornecedores_notas_internas (
  fornecedor_id        uuid PRIMARY KEY REFERENCES public.fornecedores (id) ON DELETE CASCADE,
  observacoes_internas text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_fornecedores_notas_updated ON public.fornecedores_notas_internas;
CREATE TRIGGER trg_fornecedores_notas_updated BEFORE UPDATE ON public.fornecedores_notas_internas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

