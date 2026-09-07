-- 1. Unicidade do código de reserva do canal
CREATE UNIQUE INDEX ux_pedidos_codigo_reserva_canal
  ON public.pedidos (codigo_reserva_canal)
  WHERE codigo_reserva_canal IS NOT NULL AND codigo_reserva_canal <> '';

-- 2. Índices de consulta
CREATE INDEX IF NOT EXISTS ix_pedidos_passageiro_nome ON public.pedidos (lower(passageiro_nome));
CREATE INDEX IF NOT EXISTS ix_pedidos_cidade ON public.pedidos (lower(cidade_atendimento));
CREATE INDEX IF NOT EXISTS ix_pedidos_fornecedor_data ON public.pedidos (fornecedor_id, data_hora_encontro);
CREATE INDEX IF NOT EXISTS ix_fornecedores_cidade ON public.fornecedores (lower(cidade_atuacao));
CREATE INDEX IF NOT EXISTS ix_fornecedores_user_id ON public.fornecedores (user_id);
CREATE INDEX IF NOT EXISTS ix_user_roles_user_id ON public.user_roles (user_id);

-- 3. Auditoria automática de status/fornecedor
CREATE OR REPLACE FUNCTION public.pedidos_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo, alterado_por)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.fornecedor_id IS DISTINCT FROM OLD.fornecedor_id THEN
    INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo, alterado_por)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.pedidos_audit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_pedidos_audit
  AFTER INSERT OR UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.pedidos_audit();

-- 4. Remove a gravação manual de histórico das funções (o gatilho passa a ser a única fonte)
CREATE OR REPLACE FUNCTION public.fn_atribuir_motorista(_pedido_id bigint, _fornecedor_id uuid)
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

  RETURN _pedido;
END;
$$;

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

  RETURN _pedido;
END;
$$;