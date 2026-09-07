-- Equivalente Supabase de db/migrations/0006_frota.sql — ver aquele arquivo
-- para a explicação completa. Aqui com RLS, no mesmo padrão de public.rotas
-- (leitura pública só do que está ativo, escrita só admin).
--
-- ⚠️ NÃO aplicado automaticamente por esta sessão: sem conexão MCP ativa
-- com o projeto Supabase certo, não há como rodar isto contra produção.
-- Depois de aplicado, o CRUD de admin (dados.ts) ainda precisa ganhar o
-- ramo Supabase — hoje só existe o ramo VPS, porque o cliente Supabase
-- tipado (src/integrations/supabase/client.ts, createClient<Database>) só
-- aceita nomes de tabela que já existem em types.ts, e esse arquivo só é
-- regenerado pelo próprio pipeline do Lovable depois que a migration for
-- aplicada de verdade — não dá pra escrever esse código sem quebrar o
-- typecheck antes disso acontecer. A LEITURA pública (frota.functions.ts)
-- já funciona nos dois backends desde já, porque usa um cliente Supabase
-- "avulso" (createClient sem o genérico <Database>, mesmo truque de
-- rotas.functions.ts), sem essa trava de tipos.

CREATE TABLE public.frota_veiculos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text NOT NULL,
  modelo       text NOT NULL DEFAULT '',
  passageiros  text NOT NULL DEFAULT '',
  bagagem      text NOT NULL DEFAULT '',
  foto         text NOT NULL DEFAULT '',
  itens        text[] NOT NULL DEFAULT '{}',
  ordem        integer NOT NULL DEFAULT 0,
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_frota_veiculos_nome CHECK (length(nome) BETWEEN 1 AND 120),
  CONSTRAINT ck_frota_veiculos_textos CHECK (
    length(modelo) <= 200 AND length(passageiros) <= 60 AND length(bagagem) <= 120
  )
);
GRANT SELECT ON public.frota_veiculos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_veiculos TO authenticated;
GRANT ALL ON public.frota_veiculos TO service_role;
ALTER TABLE public.frota_veiculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Veículos ativos públicos" ON public.frota_veiculos FOR SELECT TO anon, authenticated
  USING (ativo OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia veículos" ON public.frota_veiculos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER frota_veiculos_updated_at BEFORE UPDATE ON public.frota_veiculos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.frota_galeria (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foto       text NOT NULL,
  alt        text NOT NULL DEFAULT '',
  ordem      integer NOT NULL DEFAULT 0,
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_frota_galeria_foto CHECK (length(foto) BETWEEN 1 AND 2000),
  CONSTRAINT ck_frota_galeria_alt CHECK (length(alt) <= 300)
);
GRANT SELECT ON public.frota_galeria TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_galeria TO authenticated;
GRANT ALL ON public.frota_galeria TO service_role;
ALTER TABLE public.frota_galeria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Galeria ativa pública" ON public.frota_galeria FOR SELECT TO anon, authenticated
  USING (ativo OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia galeria" ON public.frota_galeria FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER frota_galeria_updated_at BEFORE UPDATE ON public.frota_galeria
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
