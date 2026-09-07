-- car-fleet-co — schema completo para Postgres próprio (VPS).
-- Espelha supabase/migrations/*.sql (12 arquivos), porém:
--   * sem schema auth (login próprio: tabelas usuarios/sessoes abaixo, igual ao
--     projeto irmão Dias Transporte)
--   * sem RLS, sem policy, sem GRANT de PostgREST — a autorização acontece no
--     servidor Node (só ele fala com este Postgres, não há acesso direto de
--     cliente via anon key aqui)
--   * sem has_role()/SECURITY DEFINER para regra de negócio — fn_transicionar_status,
--     fn_atribuir_motorista, pedidos_audit, pedidos_motorista_guard e
--     fornecedores_motorista_guard viram lógica comum em TypeScript
--     (src/lib/vps/dados.functions.ts, Fase 2), não SQL. Só ficam como trigger
--     SQL as coisas sem dependência de identidade: timestamps e normalização
--     de texto, portadas verbatim das migrations originais.
-- Aplicar com a role de migration (DDL). O runtime usa a role de app (CRUD) —
-- ver db/migrations/0002_roles.sql, idêntico em espírito ao do Dias Transporte.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- utilidades
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_data_alteracao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.data_alteracao = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------ usuários
-- Mesmo formato do Dias Transporte: papéis como booleans simples (aqui os
-- dois papéis — admin/motorista — já nascem simétricos, ao contrário de lá).
CREATE TABLE IF NOT EXISTS public.usuarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  senha_hash    text NOT NULL,
  nome          text NOT NULL DEFAULT '',
  telefone      text NOT NULL DEFAULT '',
  admin         boolean NOT NULL DEFAULT false,
  motorista     boolean NOT NULL DEFAULT false,
  ultimo_acesso timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_idx ON public.usuarios (lower(email));

DROP TRIGGER IF EXISTS usuarios_updated_at ON public.usuarios;
CREATE TRIGGER usuarios_updated_at BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.sessoes (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  expira_em  timestamptz NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessoes_user_id_idx ON public.sessoes (user_id);
CREATE INDEX IF NOT EXISTS sessoes_expira_em_idx ON public.sessoes (expira_em);

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
  updated_at             timestamptz NOT NULL DEFAULT now()
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
-- (motoristas) — user_id agora referencia usuarios(id), não mais auth.users.
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

-- ------------------------------------------------------------------- pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
  id                        bigserial PRIMARY KEY,
  codigo_reserva_canal      text,
  empresa_cliente_id        uuid REFERENCES public.empresas_clientes (id) ON DELETE RESTRICT,
  empresa_nome              text,
  canal_venda_id            uuid REFERENCES public.canais_venda (id) ON DELETE RESTRICT,
  codigo_fornecedor_reserva text,
  cidade_atendimento        text NOT NULL,
  hotel                     text,
  data_hora_encontro        timestamptz NOT NULL,
  direcao                   public.pedido_direcao NOT NULL,
  passageiro_nome           text NOT NULL,
  passageiro_telefone       text,
  ponto_partida             text,
  ponto_chegada             text,
  numero_voo                text,
  categoria_veiculo_id      uuid REFERENCES public.categorias_veiculo (id) ON DELETE SET NULL,
  fornecedor_id             uuid REFERENCES public.fornecedores (id) ON DELETE SET NULL,
  status                    public.pedido_status NOT NULL DEFAULT 'pendente_liberacao',
  observacao_motorista      text,
  data_emissao              timestamptz NOT NULL DEFAULT now(),
  data_alteracao            timestamptz NOT NULL DEFAULT now(),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_pedidos_passageiro_nome CHECK (length(passageiro_nome) BETWEEN 2 AND 200),
  CONSTRAINT ck_pedidos_cidade CHECK (length(cidade_atendimento) BETWEEN 2 AND 120),
  CONSTRAINT ck_pedidos_textos CHECK (
    (hotel IS NULL OR length(hotel) <= 200)
    AND (ponto_partida IS NULL OR length(ponto_partida) <= 300)
    AND (ponto_chegada IS NULL OR length(ponto_chegada) <= 300)
    AND (numero_voo IS NULL OR length(numero_voo) <= 30)
    AND (passageiro_telefone IS NULL OR length(passageiro_telefone) <= 120)
    AND (codigo_reserva_canal IS NULL OR length(codigo_reserva_canal) <= 80)
    AND (codigo_fornecedor_reserva IS NULL OR length(codigo_fornecedor_reserva) <= 80)
    AND (observacao_motorista IS NULL OR length(observacao_motorista) <= 2000)
  )
);

DROP TRIGGER IF EXISTS trg_pedidos_updated ON public.pedidos;
CREATE TRIGGER trg_pedidos_updated BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.set_data_alteracao();

-- Normalização de texto (trim + vazio vira NULL) — sem dependência de identidade.
CREATE OR REPLACE FUNCTION public.pedidos_normalizar()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.codigo_reserva_canal := NULLIF(btrim(NEW.codigo_reserva_canal), '');
  NEW.codigo_fornecedor_reserva := NULLIF(btrim(NEW.codigo_fornecedor_reserva), '');
  NEW.hotel := NULLIF(btrim(NEW.hotel), '');
  NEW.ponto_partida := NULLIF(btrim(NEW.ponto_partida), '');
  NEW.ponto_chegada := NULLIF(btrim(NEW.ponto_chegada), '');
  NEW.numero_voo := NULLIF(btrim(NEW.numero_voo), '');
  NEW.passageiro_telefone := NULLIF(btrim(NEW.passageiro_telefone), '');
  NEW.observacao_motorista := NULLIF(btrim(NEW.observacao_motorista), '');
  NEW.passageiro_nome := btrim(NEW.passageiro_nome);
  NEW.cidade_atendimento := btrim(NEW.cidade_atendimento);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedidos_normalizar ON public.pedidos;
CREATE TRIGGER trg_pedidos_normalizar BEFORE INSERT OR UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.pedidos_normalizar();

-- Mantém pedidos.empresa_nome em sincronia — puramente mecânico, sem
-- dependência de identidade, portado verbatim.
CREATE OR REPLACE FUNCTION public.pedidos_sync_empresa_nome()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.empresa_cliente_id IS NOT NULL THEN
    SELECT nome INTO NEW.empresa_nome FROM public.empresas_clientes WHERE id = NEW.empresa_cliente_id;
  ELSE
    NEW.empresa_nome := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedidos_empresa_nome_ins ON public.pedidos;
CREATE TRIGGER trg_pedidos_empresa_nome_ins BEFORE INSERT ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.pedidos_sync_empresa_nome();

DROP TRIGGER IF EXISTS trg_pedidos_empresa_nome_upd ON public.pedidos;
CREATE TRIGGER trg_pedidos_empresa_nome_upd BEFORE UPDATE OF empresa_cliente_id ON public.pedidos
FOR EACH ROW WHEN (NEW.empresa_cliente_id IS DISTINCT FROM OLD.empresa_cliente_id)
EXECUTE FUNCTION public.pedidos_sync_empresa_nome();

CREATE OR REPLACE FUNCTION public.empresas_clientes_propagate_nome()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.nome IS DISTINCT FROM OLD.nome THEN
    UPDATE public.pedidos SET empresa_nome = NEW.nome WHERE empresa_cliente_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresas_clientes_propagate_nome ON public.empresas_clientes;
CREATE TRIGGER trg_empresas_clientes_propagate_nome AFTER UPDATE OF nome ON public.empresas_clientes
FOR EACH ROW EXECUTE FUNCTION public.empresas_clientes_propagate_nome();

CREATE UNIQUE INDEX IF NOT EXISTS ux_pedidos_codigo_reserva_canal
  ON public.pedidos (codigo_reserva_canal)
  WHERE codigo_reserva_canal IS NOT NULL AND codigo_reserva_canal <> '';

CREATE INDEX IF NOT EXISTS idx_pedidos_fornecedor ON public.pedidos (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos (status);
CREATE INDEX IF NOT EXISTS idx_pedidos_data_encontro ON public.pedidos (data_hora_encontro);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa ON public.pedidos (empresa_cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_canal ON public.pedidos (canal_venda_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status_data ON public.pedidos (status, data_hora_encontro);
CREATE INDEX IF NOT EXISTS idx_pedidos_cidade ON public.pedidos (cidade_atendimento);
CREATE INDEX IF NOT EXISTS ix_pedidos_passageiro_nome ON public.pedidos (lower(passageiro_nome));
CREATE INDEX IF NOT EXISTS ix_pedidos_fornecedor_data ON public.pedidos (fornecedor_id, data_hora_encontro);

-- ------------------------------------------------------------ pedidos_notas_internas
CREATE TABLE IF NOT EXISTS public.pedidos_notas_internas (
  pedido_id            bigint PRIMARY KEY REFERENCES public.pedidos (id) ON DELETE CASCADE,
  observacoes_internas text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_pedidos_notas_internas_updated ON public.pedidos_notas_internas;
CREATE TRIGGER trg_pedidos_notas_internas_updated BEFORE UPDATE ON public.pedidos_notas_internas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --------------------------------------------------------------- pedidos_historico
-- Escrito pela camada de aplicação (Fase 2), não por um trigger SECURITY
-- DEFINER — alterado_por agora referencia usuarios(id).
CREATE TABLE IF NOT EXISTS public.pedidos_historico (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       bigint NOT NULL REFERENCES public.pedidos (id) ON DELETE CASCADE,
  status_anterior public.pedido_status,
  status_novo     public.pedido_status NOT NULL,
  alterado_por    uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  alterado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_pedido ON public.pedidos_historico (pedido_id);

COMMIT;
