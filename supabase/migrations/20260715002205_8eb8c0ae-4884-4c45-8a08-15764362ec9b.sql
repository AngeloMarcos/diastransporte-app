
-- =========================================================================
-- 001 — Types, enums e helpers
-- =========================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'motorista');

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

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_data_alteracao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.data_alteracao = now();
  RETURN NEW;
END;
$$;

-- =========================================================================
-- 002 — user_roles + has_role
-- =========================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "user_roles select own"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles admin manage"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- 003 — categorias_veiculo
-- =========================================================================
CREATE TABLE public.categorias_veiculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  capacidade_passageiros INT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.categorias_veiculo TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categorias_veiculo TO authenticated;
GRANT ALL ON public.categorias_veiculo TO service_role;

ALTER TABLE public.categorias_veiculo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_veiculo select authenticated"
  ON public.categorias_veiculo FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "cat_veiculo admin write"
  ON public.categorias_veiculo FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cat_veiculo admin update"
  ON public.categorias_veiculo FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cat_veiculo admin delete"
  ON public.categorias_veiculo FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_cat_veiculo_updated
  BEFORE UPDATE ON public.categorias_veiculo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 004 — empresas_clientes
-- =========================================================================
CREATE TABLE public.empresas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT,
  email_contato TEXT,
  telefone_contato TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_clientes TO authenticated;
GRANT ALL ON public.empresas_clientes TO service_role;

ALTER TABLE public.empresas_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresas select authenticated"
  ON public.empresas_clientes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "empresas admin insert"
  ON public.empresas_clientes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "empresas admin update"
  ON public.empresas_clientes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "empresas admin delete"
  ON public.empresas_clientes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_empresas_updated
  BEFORE UPDATE ON public.empresas_clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 005 — canais_venda
-- =========================================================================
CREATE TABLE public.canais_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ota', 'site_proprio', 'parceiro', 'outro')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.canais_venda TO authenticated;
GRANT ALL ON public.canais_venda TO service_role;

ALTER TABLE public.canais_venda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "canais select authenticated"
  ON public.canais_venda FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "canais admin insert"
  ON public.canais_venda FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "canais admin update"
  ON public.canais_venda FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "canais admin delete"
  ON public.canais_venda FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- 006 — fornecedores
-- =========================================================================
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cidade_atuacao TEXT NOT NULL,
  regiao_atuacao TEXT,
  categoria_veiculo_id UUID REFERENCES public.categorias_veiculo(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes_internas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Admin vê tudo; motorista vê só a própria linha.
CREATE POLICY "fornecedores admin select"
  ON public.fornecedores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "fornecedores admin insert"
  ON public.fornecedores FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fornecedores admin update"
  ON public.fornecedores FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fornecedores admin delete"
  ON public.fornecedores FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_fornecedores_updated
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- 007 — pedidos
-- =========================================================================
CREATE TABLE public.pedidos (
  id BIGSERIAL PRIMARY KEY,
  codigo_reserva_canal TEXT,
  empresa_cliente_id UUID REFERENCES public.empresas_clientes(id) ON DELETE RESTRICT,
  canal_venda_id UUID REFERENCES public.canais_venda(id) ON DELETE RESTRICT,
  codigo_fornecedor_reserva TEXT,
  cidade_atendimento TEXT NOT NULL,
  hotel TEXT,
  data_hora_encontro TIMESTAMPTZ NOT NULL,
  direcao public.pedido_direcao NOT NULL,
  passageiro_nome TEXT NOT NULL,
  passageiro_telefone TEXT,
  ponto_partida TEXT,
  ponto_chegada TEXT,
  numero_voo TEXT,
  categoria_veiculo_id UUID REFERENCES public.categorias_veiculo(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  status public.pedido_status NOT NULL DEFAULT 'pendente_liberacao',
  observacoes_internas TEXT,
  observacao_motorista TEXT,
  data_emissao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_alteracao TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.pedidos_id_seq TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
GRANT ALL ON SEQUENCE public.pedidos_id_seq TO service_role;

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Admin: tudo.
CREATE POLICY "pedidos admin all"
  ON public.pedidos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Motorista: SELECT dos próprios pedidos.
CREATE POLICY "pedidos motorista select"
  ON public.pedidos FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'motorista')
    AND fornecedor_id = (SELECT id FROM public.fornecedores WHERE user_id = auth.uid())
  );

-- Motorista: UPDATE apenas em observacao_motorista (status é via função SECURITY DEFINER).
CREATE POLICY "pedidos motorista update observacao"
  ON public.pedidos FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'motorista')
    AND fornecedor_id = (SELECT id FROM public.fornecedores WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'motorista')
    AND fornecedor_id = (SELECT id FROM public.fornecedores WHERE user_id = auth.uid())
  );

-- Trigger data_alteracao / updated_at
CREATE TRIGGER trg_pedidos_updated
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.set_data_alteracao();

-- Trigger: motorista só pode alterar observacao_motorista (defesa em profundidade).
CREATE OR REPLACE FUNCTION public.pedidos_motorista_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Admins e chamadas internas (SECURITY DEFINER) passam livres.
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'motorista') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.fornecedor_id IS DISTINCT FROM OLD.fornecedor_id
       OR NEW.empresa_cliente_id IS DISTINCT FROM OLD.empresa_cliente_id
       OR NEW.canal_venda_id IS DISTINCT FROM OLD.canal_venda_id
       OR NEW.data_hora_encontro IS DISTINCT FROM OLD.data_hora_encontro
       OR NEW.direcao IS DISTINCT FROM OLD.direcao
       OR NEW.passageiro_nome IS DISTINCT FROM OLD.passageiro_nome
       OR NEW.cidade_atendimento IS DISTINCT FROM OLD.cidade_atendimento
       OR NEW.hotel IS DISTINCT FROM OLD.hotel
       OR NEW.ponto_partida IS DISTINCT FROM OLD.ponto_partida
       OR NEW.ponto_chegada IS DISTINCT FROM OLD.ponto_chegada
       OR NEW.numero_voo IS DISTINCT FROM OLD.numero_voo
       OR NEW.categoria_veiculo_id IS DISTINCT FROM OLD.categoria_veiculo_id
       OR NEW.codigo_reserva_canal IS DISTINCT FROM OLD.codigo_reserva_canal
       OR NEW.codigo_fornecedor_reserva IS DISTINCT FROM OLD.codigo_fornecedor_reserva
       OR NEW.observacoes_internas IS DISTINCT FROM OLD.observacoes_internas
       OR NEW.passageiro_telefone IS DISTINCT FROM OLD.passageiro_telefone
    THEN
      RAISE EXCEPTION 'Motorista só pode alterar observacao_motorista via UPDATE direto.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pedidos_motorista_guard
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.pedidos_motorista_guard();

-- =========================================================================
-- 008 — pedidos_historico
-- =========================================================================
CREATE TABLE public.pedidos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id BIGINT NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status_anterior public.pedido_status,
  status_novo public.pedido_status NOT NULL,
  alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pedidos_historico TO authenticated;
GRANT ALL ON public.pedidos_historico TO service_role;

ALTER TABLE public.pedidos_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historico admin select"
  ON public.pedidos_historico FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "historico motorista select"
  ON public.pedidos_historico FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'motorista')
    AND pedido_id IN (
      SELECT id FROM public.pedidos
      WHERE fornecedor_id = (SELECT id FROM public.fornecedores WHERE user_id = auth.uid())
    )
  );

-- =========================================================================
-- 009 — indices
-- =========================================================================
CREATE INDEX idx_pedidos_fornecedor ON public.pedidos(fornecedor_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_data_encontro ON public.pedidos(data_hora_encontro);
CREATE INDEX idx_pedidos_empresa ON public.pedidos(empresa_cliente_id);
CREATE INDEX idx_pedidos_canal ON public.pedidos(canal_venda_id);
CREATE INDEX idx_pedidos_status_data ON public.pedidos(status, data_hora_encontro);
CREATE INDEX idx_pedidos_cidade ON public.pedidos(cidade_atendimento);
CREATE INDEX idx_historico_pedido ON public.pedidos_historico(pedido_id);

-- =========================================================================
-- 010 — fn_transicionar_status
-- =========================================================================
CREATE OR REPLACE FUNCTION public.fn_transicionar_status(
  _pedido_id BIGINT,
  _novo_status public.pedido_status
)
RETURNS public.pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pedido public.pedidos;
  _uid UUID := auth.uid();
  _is_admin BOOLEAN := public.has_role(_uid, 'admin');
  _is_motorista BOOLEAN := public.has_role(_uid, 'motorista');
  _fornecedor_id UUID;
  _atual public.pedido_status;
  _valido BOOLEAN := FALSE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO _pedido FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % não encontrado', _pedido_id;
  END IF;

  _atual := _pedido.status;

  -- Autorização: admin OK; motorista só se for o fornecedor atribuído.
  IF _is_motorista AND NOT _is_admin THEN
    SELECT id INTO _fornecedor_id FROM public.fornecedores WHERE user_id = _uid;
    IF _fornecedor_id IS NULL OR _pedido.fornecedor_id IS DISTINCT FROM _fornecedor_id THEN
      RAISE EXCEPTION 'Pedido não pertence a este motorista';
    END IF;
  ELSIF NOT _is_admin THEN
    RAISE EXCEPTION 'Sem permissão para transicionar status';
  END IF;

  -- Matriz de transições permitidas
  IF _novo_status = 'venda_cancelada' AND _atual NOT IN ('corrida_finalizada','no_show_driver','no_show_pax') THEN
    _valido := _is_admin;
  ELSIF _atual = 'pendente_liberacao' AND _novo_status IN ('liberada_rede') THEN
    _valido := _is_admin;
  ELSIF _atual = 'liberada_rede' AND _novo_status IN ('motorista_atribuido','aguardando_aceite_rede') THEN
    _valido := _is_admin;
  ELSIF _atual IN ('motorista_atribuido','aguardando_aceite_rede') AND _novo_status = 'aceita_motorista' THEN
    _valido := TRUE; -- admin ou motorista
  ELSIF _atual = 'aceita_motorista' AND _novo_status = 'em_atendimento' THEN
    _valido := TRUE;
  ELSIF _atual = 'em_atendimento' AND _novo_status IN ('corrida_finalizada','no_show_driver','no_show_pax') THEN
    _valido := TRUE;
  END IF;

  IF NOT _valido THEN
    RAISE EXCEPTION 'Transição inválida: % -> %', _atual, _novo_status;
  END IF;

  UPDATE public.pedidos
     SET status = _novo_status
   WHERE id = _pedido_id
   RETURNING * INTO _pedido;

  INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo, alterado_por)
  VALUES (_pedido_id, _atual, _novo_status, _uid);

  RETURN _pedido;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_transicionar_status(BIGINT, public.pedido_status) TO authenticated;

-- Função helper: atribuir motorista (admin only)
CREATE OR REPLACE FUNCTION public.fn_atribuir_motorista(
  _pedido_id BIGINT,
  _fornecedor_id UUID
)
RETURNS public.pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pedido public.pedidos;
  _uid UUID := auth.uid();
BEGIN
  IF NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas admin pode atribuir motorista';
  END IF;

  UPDATE public.pedidos
     SET fornecedor_id = _fornecedor_id,
         status = CASE
           WHEN status IN ('pendente_liberacao','liberada_rede','aguardando_aceite_rede')
             THEN 'motorista_atribuido'::public.pedido_status
           ELSE status
         END
   WHERE id = _pedido_id
   RETURNING * INTO _pedido;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % não encontrado', _pedido_id;
  END IF;

  INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo, alterado_por)
  VALUES (_pedido_id, _pedido.status, _pedido.status, _uid);

  RETURN _pedido;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_atribuir_motorista(BIGINT, UUID) TO authenticated;
