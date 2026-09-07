
-- 1) GRANTs explícitos (portabilidade fora do Supabase Cloud)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_clientes    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canais_venda         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_veiculo   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_historico    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles           TO authenticated;

GRANT ALL ON public.empresas_clientes    TO service_role;
GRANT ALL ON public.canais_venda         TO service_role;
GRANT ALL ON public.fornecedores         TO service_role;
GRANT ALL ON public.categorias_veiculo   TO service_role;
GRANT ALL ON public.pedidos              TO service_role;
GRANT ALL ON public.pedidos_historico    TO service_role;
GRANT ALL ON public.user_roles           TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.pedidos_id_seq TO authenticated;

-- 2) canais_venda: coluna e trigger updated_at
ALTER TABLE public.canais_venda
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_canais_venda_updated_at ON public.canais_venda;
CREATE TRIGGER trg_canais_venda_updated_at
  BEFORE UPDATE ON public.canais_venda
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Bug de auditoria em fn_atribuir_motorista
CREATE OR REPLACE FUNCTION public.fn_atribuir_motorista(_pedido_id bigint, _fornecedor_id uuid)
RETURNS public.pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _pedido public.pedidos;
  _uid UUID := auth.uid();
  _status_anterior public.pedido_status;
BEGIN
  IF NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'Apenas admin pode atribuir motorista';
  END IF;

  SELECT status INTO _status_anterior FROM public.pedidos WHERE id = _pedido_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % não encontrado', _pedido_id;
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

  INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo, alterado_por)
  VALUES (_pedido_id, _status_anterior, _pedido.status, _uid);

  RETURN _pedido;
END;
$function$;

-- 4) fn_transicionar_status: adiciona parâmetro _ator (default auth.uid())
CREATE OR REPLACE FUNCTION public.fn_transicionar_status(
  _pedido_id bigint,
  _novo_status public.pedido_status,
  _ator uuid DEFAULT auth.uid()
)
RETURNS public.pedidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _pedido public.pedidos;
  _uid UUID := _ator;
  _is_admin BOOLEAN := public.has_role(_uid, 'admin');
  _is_motorista BOOLEAN := public.has_role(_uid, 'motorista');
  _fornecedor_id UUID;
  _atual public.pedido_status;
  _valido BOOLEAN := FALSE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Ator não informado';
  END IF;

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
$function$;

REVOKE ALL ON FUNCTION public.fn_transicionar_status(bigint, public.pedido_status, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_transicionar_status(bigint, public.pedido_status, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_atribuir_motorista(bigint, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_atribuir_motorista(bigint, uuid) TO authenticated;
