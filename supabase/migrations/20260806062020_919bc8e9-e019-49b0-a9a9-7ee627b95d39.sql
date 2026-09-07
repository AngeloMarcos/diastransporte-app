-- 1. Tabela de notas internas sobre fornecedores (admin-only)
CREATE TABLE public.fornecedores_notas_internas (
  fornecedor_id uuid PRIMARY KEY REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  observacoes_internas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores_notas_internas TO authenticated;
GRANT ALL ON public.fornecedores_notas_internas TO service_role;

ALTER TABLE public.fornecedores_notas_internas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fornecedores notas admin all"
  ON public.fornecedores_notas_internas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_fornecedores_notas_updated
  BEFORE UPDATE ON public.fornecedores_notas_internas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Migra dados e remove a coluna sensível de fornecedores
INSERT INTO public.fornecedores_notas_internas (fornecedor_id, observacoes_internas)
SELECT id, observacoes_internas
FROM public.fornecedores
WHERE observacoes_internas IS NOT NULL AND btrim(observacoes_internas) <> '';

ALTER TABLE public.fornecedores DROP COLUMN observacoes_internas;

-- 3. Motorista pode atualizar apenas o próprio cadastro
CREATE OR REPLACE FUNCTION public.fornecedores_motorista_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.cidade_atuacao IS DISTINCT FROM OLD.cidade_atuacao
     OR NEW.regiao_atuacao IS DISTINCT FROM OLD.regiao_atuacao
     OR NEW.categoria_veiculo_id IS DISTINCT FROM OLD.categoria_veiculo_id
     OR NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.email IS DISTINCT FROM OLD.email
  THEN
    RAISE EXCEPTION 'Motorista pode alterar apenas nome e telefone do proprio cadastro.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fornecedores_motorista_guard
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.fornecedores_motorista_guard();

CREATE POLICY "fornecedores motorista update own"
  ON public.fornecedores FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());