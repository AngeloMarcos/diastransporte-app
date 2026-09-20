-- Sprint 2 (auditoria do site, achado A3): o preço podia ser burlado. O
-- período da tarifa ("dia" / "noite", 18h às 5h) era um botão manual da tela
-- de reserva, independente do horário digitado — às 22:00 com o botão em
-- "Dia", o carro grande da rota São Luís → Barreirinhas saía R$ 900 em vez
-- de R$ 950. E o trigger de preço abaixo confiava no `periodo` que o
-- navegador mandava, então nem a tela corrigida bastaria: qualquer chamada
-- direta ao servidor escolhia a tarifa que quisesse.
--
-- Agora o trigger DERIVA o período do horário quando ele é um HH:MM válido,
-- ignorando o que veio em `periodo`. Sem horário (só escrita administrativa
-- e reservas históricas — o servidor de reservas passou a exigi-lo), mantém
-- o período informado, como antes. Mesma regra de src/lib/periodo.ts:
-- noite = 18:00 até 04:59; 05:00 em ponto já é dia.
--
-- `hora` entra na lista de colunas do trigger: editar só o horário de um
-- agendamento no admin agora recalcula o valor.
-- Equivalente Lovable/Supabase: supabase/migrations/20260920000000_periodo_pela_hora.sql.

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
