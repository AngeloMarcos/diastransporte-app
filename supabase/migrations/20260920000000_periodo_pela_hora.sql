-- Paridade Supabase/Lovable de db/migrations/0014_periodo_pela_hora.sql
-- (Sprint 2, achado A3 da auditoria do site): o trigger de preço deriva o
-- período (dia/noite) do horário da viagem em vez de confiar no que o
-- navegador manda. NÃO aplicado automaticamente — mesma nota de
-- 20260907000000_agendamentos_constraints.sql: aplicar manualmente no SQL
-- editor do Lovable/Supabase se o site ainda rodar lá.


CREATE OR REPLACE FUNCTION public.agendamentos_calcular_valor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  r public.rotas;
  h int;
BEGIN
  SELECT * INTO r FROM public.rotas WHERE id = NEW.rota_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rota informada não existe.';
  END IF;
  IF NOT r.ativo THEN
    RAISE EXCEPTION 'Rota indisponível para reserva.';
  END IF;

  IF NEW.hora IS NOT NULL AND NEW.hora ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$' THEN
    h := split_part(NEW.hora, ':', 1)::int;
    NEW.periodo := CASE WHEN h >= 18 OR h < 5 THEN 'noite' ELSE 'dia' END;
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
BEFORE INSERT OR UPDATE OF rota_id, carro, periodo, hora, valor ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.agendamentos_calcular_valor();
