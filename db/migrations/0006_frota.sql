-- Frota (carros e galeria de fotos "na estrada") — hoje hardcoded em
-- src/data/rotas.ts (veiculos) e src/routes/frota.tsx (galeria), sem
-- nenhuma forma de editar sem deploy de código. Passa a ser dado de
-- verdade, editável pelo admin, com fallback pro conteúdo estático atual
-- enquanto as tabelas estiverem vazias (mesmo padrão de rotas/conteudo_site
-- — ver rotas.functions.ts::listRotas). Sem seed: os dois carros e as 8
-- fotos atuais usam URLs de asset processadas pelo Vite (hash muda a cada
-- build), não dá pra gravar como dado fixo no banco sem quebrar no próximo
-- build — o fallback estático já cobre isso até o admin subir fotos reais.

BEGIN;

CREATE TABLE IF NOT EXISTS public.frota_veiculos (
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

CREATE INDEX IF NOT EXISTS frota_veiculos_ativo_ordem_idx
  ON public.frota_veiculos (ativo, ordem);

DROP TRIGGER IF EXISTS frota_veiculos_updated_at ON public.frota_veiculos;
CREATE TRIGGER frota_veiculos_updated_at BEFORE UPDATE ON public.frota_veiculos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.frota_galeria (
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

CREATE INDEX IF NOT EXISTS frota_galeria_ativo_ordem_idx
  ON public.frota_galeria (ativo, ordem);

DROP TRIGGER IF EXISTS frota_galeria_updated_at ON public.frota_galeria;
CREATE TRIGGER frota_galeria_updated_at BEFORE UPDATE ON public.frota_galeria
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
