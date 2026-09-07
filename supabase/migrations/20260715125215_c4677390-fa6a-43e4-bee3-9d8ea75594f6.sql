
-- =========================================================================
-- 1) MOVE observacoes_internas TO ADMIN-ONLY TABLE
-- =========================================================================
CREATE TABLE public.pedidos_notas_internas (
  pedido_id BIGINT PRIMARY KEY REFERENCES public.pedidos(id) ON DELETE CASCADE,
  observacoes_internas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_notas_internas TO authenticated;
GRANT ALL ON public.pedidos_notas_internas TO service_role;

ALTER TABLE public.pedidos_notas_internas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas internas admin all"
  ON public.pedidos_notas_internas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_pedidos_notas_internas_updated
  BEFORE UPDATE ON public.pedidos_notas_internas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Migrate existing values
INSERT INTO public.pedidos_notas_internas (pedido_id, observacoes_internas)
SELECT id, observacoes_internas FROM public.pedidos WHERE observacoes_internas IS NOT NULL;

-- Update guard trigger: drop reference to observacoes_internas column (which is going away)
CREATE OR REPLACE FUNCTION public.pedidos_motorista_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
       OR NEW.passageiro_telefone IS DISTINCT FROM OLD.passageiro_telefone
    THEN
      RAISE EXCEPTION 'Motorista só pode alterar observacao_motorista via UPDATE direto.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.pedidos DROP COLUMN observacoes_internas;

-- =========================================================================
-- 2) DENORMALIZE empresa nome ON pedidos + RESTRICT empresas_clientes SELECT
-- =========================================================================
ALTER TABLE public.pedidos ADD COLUMN empresa_nome TEXT;

-- Backfill
UPDATE public.pedidos p
   SET empresa_nome = e.nome
  FROM public.empresas_clientes e
 WHERE p.empresa_cliente_id = e.id;

-- Trigger to keep empresa_nome in sync on pedidos insert/update of empresa_cliente_id
CREATE OR REPLACE FUNCTION public.pedidos_sync_empresa_nome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE TRIGGER trg_pedidos_empresa_nome_ins
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.pedidos_sync_empresa_nome();

CREATE TRIGGER trg_pedidos_empresa_nome_upd
  BEFORE UPDATE OF empresa_cliente_id ON public.pedidos
  FOR EACH ROW WHEN (NEW.empresa_cliente_id IS DISTINCT FROM OLD.empresa_cliente_id)
  EXECUTE FUNCTION public.pedidos_sync_empresa_nome();

-- When empresas_clientes.nome changes, propagate
CREATE OR REPLACE FUNCTION public.empresas_clientes_propagate_nome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nome IS DISTINCT FROM OLD.nome THEN
    UPDATE public.pedidos SET empresa_nome = NEW.nome WHERE empresa_cliente_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_empresas_clientes_propagate_nome
  AFTER UPDATE OF nome ON public.empresas_clientes
  FOR EACH ROW EXECUTE FUNCTION public.empresas_clientes_propagate_nome();

-- Restrict empresas_clientes SELECT to admins only
DROP POLICY IF EXISTS "empresas select authenticated" ON public.empresas_clientes;
CREATE POLICY "empresas select admin"
  ON public.empresas_clientes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- 3) FIX fn_transicionar_status: drop 3-arg spoofable overload; enforce auth.uid()
-- =========================================================================
DROP FUNCTION IF EXISTS public.fn_transicionar_status(bigint, public.pedido_status, uuid);
DROP FUNCTION IF EXISTS public.fn_transicionar_status(bigint, public.pedido_status);

CREATE OR REPLACE FUNCTION public.fn_transicionar_status(_pedido_id bigint, _novo_status public.pedido_status)
RETURNS public.pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pedido public.pedidos;
  _uid UUID := auth.uid();
  _is_admin BOOLEAN;
  _is_motorista BOOLEAN;
  _fornecedor_id UUID;
  _atual public.pedido_status;
  _valido BOOLEAN := FALSE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  _is_admin := public.has_role(_uid, 'admin');
  _is_motorista := public.has_role(_uid, 'motorista');

  SELECT * INTO _pedido FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % não encontrado', _pedido_id;
  END IF;

  _atual := _pedido.status;

  IF _is_motorista AND NOT _is_admin THEN
    SELECT id INTO _fornecedor_id FROM public.fornecedores WHERE user_id = _uid;
    IF _fornecedor_id IS NULL OR _pedido.fornecedor_id IS DISTINCT FROM _fornecedor_id THEN
      RAISE EXCEPTION 'Pedido não pertence a este motorista';
    END IF;
  ELSIF NOT _is_admin THEN
    RAISE EXCEPTION 'Sem permissão para transicionar status';
  END IF;

  IF _novo_status = 'venda_cancelada' AND _atual NOT IN ('corrida_finalizada','no_show_driver','no_show_pax') THEN
    _valido := _is_admin;
  ELSIF _atual = 'pendente_liberacao' AND _novo_status IN ('liberada_rede') THEN
    _valido := _is_admin;
  ELSIF _atual = 'liberada_rede' AND _novo_status IN ('motorista_atribuido','aguardando_aceite_rede') THEN
    _valido := _is_admin;
  ELSIF _atual IN ('motorista_atribuido','aguardando_aceite_rede') AND _novo_status = 'aceita_motorista' THEN
    _valido := TRUE;
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

-- =========================================================================
-- 4) TIGHTEN EXECUTE ON SECURITY DEFINER FUNCTIONS
-- =========================================================================
-- Trigger-only helpers: no direct callers should have EXECUTE.
REVOKE ALL ON FUNCTION public.set_updated_at()               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_data_alteracao()           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pedidos_motorista_guard()      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pedidos_sync_empresa_nome()    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.empresas_clientes_propagate_nome() FROM PUBLIC, anon, authenticated;

-- has_role: required by RLS policies for authenticated; anon must not call it.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Business RPCs: authenticated only; anon revoked.
REVOKE ALL ON FUNCTION public.fn_transicionar_status(bigint, public.pedido_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_transicionar_status(bigint, public.pedido_status) TO authenticated;

REVOKE ALL ON FUNCTION public.fn_atribuir_motorista(bigint, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_atribuir_motorista(bigint, uuid) TO authenticated;
