-- 1. Histórico preservado: user_id deixa de apagar em cascata
ALTER TABLE public.agendamentos ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.agendamentos DROP CONSTRAINT agendamentos_user_id_fkey;
ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. rota_id obrigatório (preço oficial precisa da rota)
ALTER TABLE public.agendamentos ALTER COLUMN rota_id SET NOT NULL;

-- 4. Preço calculado no servidor a partir de public.rotas
CREATE OR REPLACE FUNCTION public.agendamentos_calcular_valor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.agendamentos_calcular_valor() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS agendamentos_valor_oficial ON public.agendamentos;
CREATE TRIGGER agendamentos_valor_oficial
BEFORE INSERT OR UPDATE OF rota_id, carro, periodo, valor ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.agendamentos_calcular_valor();

-- 5. Índices de performance
CREATE INDEX IF NOT EXISTS agendamentos_user_id_idx ON public.agendamentos (user_id);
CREATE INDEX IF NOT EXISTS agendamentos_rota_id_idx ON public.agendamentos (rota_id);
CREATE INDEX IF NOT EXISTS agendamentos_status_idx ON public.agendamentos (status);
CREATE INDEX IF NOT EXISTS agendamentos_created_at_idx ON public.agendamentos (created_at DESC);