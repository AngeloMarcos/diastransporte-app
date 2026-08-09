CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  VALUES (
    NEW.id,
    CASE WHEN lower(NEW.email) IN ('mentoark@gmail.com','angelobispofilho@gmail.com','stefanocatedral@hotmail.com')
      THEN 'admin'::public.app_role ELSE 'user'::public.app_role END
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN ('mentoark@gmail.com','angelobispofilho@gmail.com','stefanocatedral@hotmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

CREATE TABLE public.conteudo_site (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  secao text NOT NULL DEFAULT 'geral',
  titulo text NOT NULL DEFAULT '',
  texto text NOT NULL DEFAULT '',
  imagem text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.conteudo_site TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conteudo_site TO authenticated;
GRANT ALL ON public.conteudo_site TO service_role;

ALTER TABLE public.conteudo_site ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conteudo do site publico" ON public.conteudo_site
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admin gerencia conteudo do site" ON public.conteudo_site
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER conteudo_site_updated_at BEFORE UPDATE ON public.conteudo_site
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.conteudo_site (chave, secao, titulo, texto, imagem, ordem) VALUES
  ('home_hero', 'home', 'Transfers executivos em São Luís e Lençóis Maranhenses', 'Motoristas próprios, carros higienizados e monitoramento de voo. Reserve em minutos pelo WhatsApp.', '', 1),
  ('home_sobre', 'home', 'Por que a Dias Transporte', 'Mais de 10 anos levando passageiros com pontualidade entre São Luís, Barreirinhas, Santo Amaro e Atins.', '', 2),
  ('frota_intro', 'frota', 'Nossa frota', 'Sedans e SUVs revisados, ar-condicionado, espaço para bagagem e cadeirinha sob solicitação.', '', 1),
  ('contato_intro', 'contato', 'Fale com a gente', 'Atendimento todos os dias pelo WhatsApp (98) 98150-6268.', '', 1);