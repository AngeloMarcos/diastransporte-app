-- Robustez antes da primeira reserva real (revisão de banco/backend):
--
--  1. A reserva do site (agendamentos) e o pedido do despacho (pedidos) só se
--     relacionavam por um texto ("dias-transporte:<uuid>" em
--     pedidos.codigo_reserva_canal), sem chave estrangeira e sem sincronizar
--     status: cancelar a reserva não cancelava o pedido, e finalizar a corrida
--     não aparecia pro cliente em "Minhas viagens". Agora há agendamentos.pedido_id
--     (FK) e dois triggers mantêm os status coerentes, qualquer que seja o
--     caminho de código que altere um dos lados.
--  2. Reserva duplicada (duplo clique, duas abas, reenvio) só era barrada na
--     tela; agora o próprio banco recusa a mesma combinação usuário + rota +
--     data + hora + carro enquanto a reserva não estiver cancelada.
--  3. agendamentos.motorista_id: modelo antigo de motorista, sem uso real e sem
--     tela que o mostrasse a quem recebe a corrida (o motorista trabalha em
--     fornecedores + pedidos.fornecedor_id). Removido.

-- ---------------------------------------------------------------- 1. elo
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS pedido_id bigint REFERENCES public.pedidos (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_agendamentos_pedido
  ON public.agendamentos (pedido_id) WHERE pedido_id IS NOT NULL;

-- Reservas que já geraram pedido (pela convenção antiga de código) ganham o elo.
UPDATE public.agendamentos a
   SET pedido_id = p.id
  FROM public.pedidos p
 WHERE a.pedido_id IS NULL
   AND p.codigo_reserva_canal = 'dias-transporte:' || a.id::text;

-- reserva -> pedido: cancelar a reserva cancela o pedido (se ainda não terminou).
CREATE OR REPLACE FUNCTION public.agendamento_sincroniza_pedido()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  anterior public.pedido_status;
BEGIN
  IF NEW.status = 'cancelado' AND NEW.pedido_id IS NOT NULL THEN
    SELECT status INTO anterior FROM public.pedidos WHERE id = NEW.pedido_id FOR UPDATE;
    IF anterior IS NOT NULL
       AND anterior NOT IN ('venda_cancelada', 'corrida_finalizada', 'no_show_driver', 'no_show_pax') THEN
      UPDATE public.pedidos
         SET status = 'venda_cancelada', data_alteracao = now()
       WHERE id = NEW.pedido_id;
      INSERT INTO public.pedidos_historico (pedido_id, status_anterior, status_novo)
      VALUES (NEW.pedido_id, anterior, 'venda_cancelada');
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_agendamento_sincroniza_pedido ON public.agendamentos;
CREATE TRIGGER trg_agendamento_sincroniza_pedido
  AFTER UPDATE OF status ON public.agendamentos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.pedido_id IS NOT NULL)
  EXECUTE FUNCTION public.agendamento_sincroniza_pedido();

-- pedido -> reserva: o que acontece no despacho aparece pro cliente.
--   venda cancelada        -> reserva cancelada
--   corrida finalizada     -> reserva concluída
--   liberada / motorista   -> reserva confirmada (se ainda pendente)
-- Só mexe em reservas que ainda estão em aberto (pendente/confirmado), então nunca
-- reabre uma cancelada nem sobrescreve uma concluída.
CREATE OR REPLACE FUNCTION public.pedido_sincroniza_agendamento()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'venda_cancelada' THEN
    UPDATE public.agendamentos SET status = 'cancelado'
     WHERE pedido_id = NEW.id AND status IN ('pendente', 'confirmado');
  ELSIF NEW.status = 'corrida_finalizada' THEN
    UPDATE public.agendamentos SET status = 'concluido'
     WHERE pedido_id = NEW.id AND status IN ('pendente', 'confirmado');
  ELSIF NEW.status IN ('liberada_rede', 'motorista_atribuido', 'aguardando_aceite_rede',
                       'aceita_motorista', 'em_atendimento') THEN
    UPDATE public.agendamentos SET status = 'confirmado'
     WHERE pedido_id = NEW.id AND status = 'pendente';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedido_sincroniza_agendamento ON public.pedidos;
CREATE TRIGGER trg_pedido_sincroniza_agendamento
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.pedido_sincroniza_agendamento();

-- ------------------------------------------------------- 2. sem duplicata
CREATE UNIQUE INDEX IF NOT EXISTS ux_agendamentos_sem_duplicata
  ON public.agendamentos (user_id, rota_id, data_viagem, hora, carro)
  WHERE status <> 'cancelado'
    AND user_id IS NOT NULL AND data_viagem IS NOT NULL AND hora IS NOT NULL;

-- ------------------------------------------------ 3. modelo antigo de motorista
ALTER TABLE public.agendamentos DROP COLUMN IF EXISTS motorista_id;
