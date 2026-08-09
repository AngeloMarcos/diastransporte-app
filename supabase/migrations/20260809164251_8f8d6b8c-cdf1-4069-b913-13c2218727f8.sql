CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nome text,
  telefone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Perfil próprio visível" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Perfil próprio editável" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Perfil próprio criável" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Papéis próprios visíveis" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, telefone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN lower(NEW.email) = 'mentoark@gmail.com' THEN 'admin'::public.app_role ELSE 'user'::public.app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.rotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  origem text NOT NULL,
  destino text NOT NULL,
  ida_e_volta boolean NOT NULL DEFAULT true,
  duracao text NOT NULL DEFAULT '',
  distancia text NOT NULL DEFAULT '',
  preco_pequeno integer NOT NULL DEFAULT 0,
  preco_grande integer,
  preco_pequeno_noite integer,
  preco_grande_noite integer,
  destaque text,
  popularidade integer NOT NULL DEFAULT 0,
  resumo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  embarque text[] NOT NULL DEFAULT '{}',
  foto text NOT NULL DEFAULT '',
  galeria text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rotas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotas TO authenticated;
GRANT ALL ON public.rotas TO service_role;
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rotas ativas públicas" ON public.rotas FOR SELECT TO anon, authenticated
  USING (ativo OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia rotas" ON public.rotas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rota_id uuid REFERENCES public.rotas(id) ON DELETE SET NULL,
  trecho text NOT NULL,
  data_viagem date,
  hora text,
  periodo text NOT NULL DEFAULT 'dia',
  carro text NOT NULL DEFAULT 'pequeno',
  passageiros integer NOT NULL DEFAULT 1,
  valor integer,
  embarque_local text,
  observacoes text,
  contato_nome text,
  contato_telefone text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agendamentos próprios visíveis" ON public.agendamentos FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Criar agendamento próprio" ON public.agendamentos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Atualizar agendamento próprio ou admin" ON public.agendamentos FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin remove agendamentos" ON public.agendamentos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER rotas_updated_at BEFORE UPDATE ON public.rotas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER agendamentos_updated_at BEFORE UPDATE ON public.agendamentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();