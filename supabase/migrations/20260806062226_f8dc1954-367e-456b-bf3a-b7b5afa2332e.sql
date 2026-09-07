-- Normalização de texto (trim + vazio vira NULL)
CREATE OR REPLACE FUNCTION public.pedidos_normalizar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.codigo_reserva_canal := NULLIF(btrim(NEW.codigo_reserva_canal), '');
  NEW.codigo_fornecedor_reserva := NULLIF(btrim(NEW.codigo_fornecedor_reserva), '');
  NEW.hotel := NULLIF(btrim(NEW.hotel), '');
  NEW.ponto_partida := NULLIF(btrim(NEW.ponto_partida), '');
  NEW.ponto_chegada := NULLIF(btrim(NEW.ponto_chegada), '');
  NEW.numero_voo := NULLIF(btrim(NEW.numero_voo), '');
  NEW.passageiro_telefone := NULLIF(btrim(NEW.passageiro_telefone), '');
  NEW.observacao_motorista := NULLIF(btrim(NEW.observacao_motorista), '');
  NEW.passageiro_nome := btrim(NEW.passageiro_nome);
  NEW.cidade_atendimento := btrim(NEW.cidade_atendimento);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.pedidos_normalizar() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_pedidos_normalizar
  BEFORE INSERT OR UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.pedidos_normalizar();

CREATE OR REPLACE FUNCTION public.fornecedores_normalizar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.nome := btrim(NEW.nome);
  NEW.cidade_atuacao := btrim(NEW.cidade_atuacao);
  NEW.email := NULLIF(lower(btrim(NEW.email)), '');
  NEW.telefone := NULLIF(btrim(NEW.telefone), '');
  NEW.regiao_atuacao := NULLIF(btrim(NEW.regiao_atuacao), '');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fornecedores_normalizar() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_fornecedores_normalizar
  BEFORE INSERT OR UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.fornecedores_normalizar();

CREATE OR REPLACE FUNCTION public.empresas_normalizar()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.nome := btrim(NEW.nome);
  NEW.documento := NULLIF(btrim(NEW.documento), '');
  NEW.email_contato := NULLIF(lower(btrim(NEW.email_contato)), '');
  NEW.telefone_contato := NULLIF(btrim(NEW.telefone_contato), '');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.empresas_normalizar() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_empresas_normalizar
  BEFORE INSERT OR UPDATE ON public.empresas_clientes
  FOR EACH ROW EXECUTE FUNCTION public.empresas_normalizar();

-- Limpeza dos dados existentes antes das constraints
UPDATE public.pedidos SET
  codigo_reserva_canal = NULLIF(btrim(codigo_reserva_canal), ''),
  passageiro_nome = btrim(passageiro_nome),
  cidade_atendimento = btrim(cidade_atendimento);
UPDATE public.fornecedores SET nome = btrim(nome), email = NULLIF(lower(btrim(email)), '');
UPDATE public.empresas_clientes SET nome = btrim(nome), email_contato = NULLIF(lower(btrim(email_contato)), '');

-- Constraints de validação
ALTER TABLE public.pedidos
  ADD CONSTRAINT ck_pedidos_passageiro_nome CHECK (length(passageiro_nome) BETWEEN 2 AND 200),
  ADD CONSTRAINT ck_pedidos_cidade CHECK (length(cidade_atendimento) BETWEEN 2 AND 120),
  ADD CONSTRAINT ck_pedidos_textos CHECK (
    (hotel IS NULL OR length(hotel) <= 200)
    AND (ponto_partida IS NULL OR length(ponto_partida) <= 300)
    AND (ponto_chegada IS NULL OR length(ponto_chegada) <= 300)
    AND (numero_voo IS NULL OR length(numero_voo) <= 30)
    AND (passageiro_telefone IS NULL OR length(passageiro_telefone) <= 120)
    AND (codigo_reserva_canal IS NULL OR length(codigo_reserva_canal) <= 80)
    AND (codigo_fornecedor_reserva IS NULL OR length(codigo_fornecedor_reserva) <= 80)
    AND (observacao_motorista IS NULL OR length(observacao_motorista) <= 2000)
  );

ALTER TABLE public.fornecedores
  ADD CONSTRAINT ck_fornecedores_nome CHECK (length(nome) BETWEEN 2 AND 200),
  ADD CONSTRAINT ck_fornecedores_email CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD CONSTRAINT ck_fornecedores_telefone CHECK (telefone IS NULL OR length(telefone) <= 120);

ALTER TABLE public.empresas_clientes
  ADD CONSTRAINT ck_empresas_nome CHECK (length(nome) BETWEEN 2 AND 200),
  ADD CONSTRAINT ck_empresas_email CHECK (email_contato IS NULL OR email_contato ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD CONSTRAINT ck_empresas_telefone CHECK (telefone_contato IS NULL OR length(telefone_contato) <= 120);