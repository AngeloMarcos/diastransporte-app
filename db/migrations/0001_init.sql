-- Dias Transporte — schema completo para Postgres próprio (VPS).
-- Equivalente às migrations de supabase/migrations/, porém:
--   * sem schema auth (login próprio: tabelas usuarios/sessoes abaixo)
--   * sem RLS e sem GRANT do PostgREST (a autorização acontece no servidor)
--   * sem SECURITY DEFINER dependente de roles do Supabase
-- Aplicar com a role de migration (DDL). O runtime usa a role de app (CRUD).

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

-- ------------------------------------------------------------------ usuários
CREATE TABLE IF NOT EXISTS public.usuarios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  senha_hash    text NOT NULL,
  nome          text NOT NULL DEFAULT '',
  telefone      text NOT NULL DEFAULT '',
  admin         boolean NOT NULL DEFAULT false,
  ultimo_acesso timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- E-mail único ignorando maiúsculas/minúsculas.
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_idx ON public.usuarios (lower(email));

DROP TRIGGER IF EXISTS usuarios_updated_at ON public.usuarios;
CREATE TRIGGER usuarios_updated_at BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sessões: token opaco guardado como hash; o cookie leva o token em claro.
CREATE TABLE IF NOT EXISTS public.sessoes (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  expira_em  timestamptz NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessoes_user_id_idx ON public.sessoes (user_id);
CREATE INDEX IF NOT EXISTS sessoes_expira_em_idx ON public.sessoes (expira_em);

-- Compatibilidade com o painel atual: profiles espelha os dados de contato.
CREATE OR REPLACE VIEW public.profiles AS
  SELECT id, email, nome, telefone, created_at FROM public.usuarios;

-- -------------------------------------------------------------------- rotas
CREATE TABLE IF NOT EXISTS public.rotas (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text NOT NULL UNIQUE,
  origem              text NOT NULL,
  destino             text NOT NULL,
  ida_e_volta         boolean NOT NULL DEFAULT true,
  duracao             text NOT NULL DEFAULT '',
  distancia           text NOT NULL DEFAULT '',
  preco_pequeno       integer NOT NULL DEFAULT 0,
  preco_grande        integer,
  preco_pequeno_noite integer,
  preco_grande_noite  integer,
  destaque            text,
  popularidade        integer NOT NULL DEFAULT 0,
  resumo              text NOT NULL DEFAULT '',
  descricao           text NOT NULL DEFAULT '',
  embarque            text[] NOT NULL DEFAULT '{}',
  foto                text NOT NULL DEFAULT '',
  galeria             text[] NOT NULL DEFAULT '{}',
  ativo               boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rotas_ativo_idx ON public.rotas (ativo);

DROP TRIGGER IF EXISTS rotas_updated_at ON public.rotas;
CREATE TRIGGER rotas_updated_at BEFORE UPDATE ON public.rotas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------- conteúdo editável
CREATE TABLE IF NOT EXISTS public.conteudo_site (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave      text NOT NULL UNIQUE,
  secao      text NOT NULL DEFAULT 'geral',
  titulo     text NOT NULL DEFAULT '',
  texto      text NOT NULL DEFAULT '',
  imagem     text NOT NULL DEFAULT '',
  ordem      integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS conteudo_site_updated_at ON public.conteudo_site;
CREATE TRIGGER conteudo_site_updated_at BEFORE UPDATE ON public.conteudo_site
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------- agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  rota_id          uuid NOT NULL REFERENCES public.rotas (id),
  trecho           text NOT NULL,
  data_viagem      date,
  hora             text,
  periodo          text NOT NULL DEFAULT 'dia',
  carro            text NOT NULL DEFAULT 'pequeno',
  passageiros      integer NOT NULL DEFAULT 1,
  valor            integer,
  embarque_local   text,
  observacoes      text,
  contato_nome     text,
  contato_telefone text,
  status           text NOT NULL DEFAULT 'pendente',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS agendamentos_updated_at ON public.agendamentos;
CREATE TRIGGER agendamentos_updated_at BEFORE UPDATE ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS agendamentos_user_id_idx ON public.agendamentos (user_id);
CREATE INDEX IF NOT EXISTS agendamentos_rota_id_idx ON public.agendamentos (rota_id);
CREATE INDEX IF NOT EXISTS agendamentos_status_idx ON public.agendamentos (status);
CREATE INDEX IF NOT EXISTS agendamentos_created_at_idx ON public.agendamentos (created_at DESC);

-- Preço oficial: sempre recalculado a partir de public.rotas, nunca do cliente.
CREATE OR REPLACE FUNCTION public.agendamentos_calcular_valor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  r public.rotas;
BEGIN
  SELECT * INTO r FROM public.rotas WHERE id = NEW.rota_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rota informada não existe.';
  END IF;
  IF NOT r.ativo THEN
    RAISE EXCEPTION 'Rota indisponível para reserva.';
  END IF;

  IF NEW.periodo NOT IN ('dia','noite') THEN
    RAISE EXCEPTION 'Período inválido: %', NEW.periodo;
  END IF;
  IF NEW.carro NOT IN ('pequeno','grande') THEN
    RAISE EXCEPTION 'Tipo de carro inválido: %', NEW.carro;
  END IF;

  IF NEW.carro = 'pequeno' THEN
    NEW.valor := CASE WHEN NEW.periodo = 'noite'
      THEN COALESCE(r.preco_pequeno_noite, r.preco_pequeno)
      ELSE r.preco_pequeno END;
  ELSE
    NEW.valor := CASE WHEN NEW.periodo = 'noite'
      THEN COALESCE(r.preco_grande_noite, r.preco_grande)
      ELSE r.preco_grande END;
  END IF;

  IF NEW.valor IS NOT NULL AND NEW.valor <= 0 THEN
    NEW.valor := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agendamentos_valor_oficial ON public.agendamentos;
CREATE TRIGGER agendamentos_valor_oficial
BEFORE INSERT OR UPDATE OF rota_id, carro, periodo, valor ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.agendamentos_calcular_valor();

COMMIT;
