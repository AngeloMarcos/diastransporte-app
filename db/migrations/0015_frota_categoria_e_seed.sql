-- Sprint 3 (auditoria do site, item 4 / A6): a frota vinha quebrada — um
-- veículo sem foto virava um quadrado preto no site, "passageiros" e
-- "bagagem" eram texto livre (não dava pra comparar nem validar), e nada
-- ligava um veículo à categoria do tarifário (carro pequeno / grande).
--
-- 1) Colunas novas: categoria (a mesma do tarifário: 'pequeno'/'grande'),
--    capacidade de passageiros, malas e placa. Os textos exibidos no site
--    (passageiros/bagagem) continuam existindo — o servidor passa a
--    compô-los a partir dos números ("Até 4 passageiros"), então nenhuma
--    tela pública muda.
-- 2) A frota real (2 veículos) e a galeria "Na estrada" (8 fotos) passam a
--    morar no banco, editáveis no admin — antes só existiam no fallback
--    estático de src/data/rotas.ts. Semeado SÓ se não houver nenhum veículo
--    ativo (galeria: nenhuma foto) — rodar de novo, ou ter o admin já com a
--    própria frota no ar, nunca duplica nem sobrescreve. Fotos = arquivos
--    de public/frota/.
-- 3) Regra nova (mesma do servidor): veículo VISÍVEL precisa de foto.
--    Veículo ativo sem foto existente (o "SANDERO" de teste que aparecia
--    como quadrado preto no site) é ESCONDIDO, não apagado — vira rascunho
--    que o admin completa ou remove.

ALTER TABLE public.frota_veiculos
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS capacidade_passageiros integer,
  ADD COLUMN IF NOT EXISTS malas integer,
  ADD COLUMN IF NOT EXISTS placa text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_frota_veiculos_categoria') THEN
    ALTER TABLE public.frota_veiculos
      ADD CONSTRAINT ck_frota_veiculos_categoria
        CHECK (categoria IS NULL OR categoria IN ('pequeno', 'grande')),
      ADD CONSTRAINT ck_frota_veiculos_capacidade
        CHECK (capacidade_passageiros IS NULL OR capacidade_passageiros BETWEEN 1 AND 20),
      ADD CONSTRAINT ck_frota_veiculos_malas
        CHECK (malas IS NULL OR malas BETWEEN 0 AND 30),
      ADD CONSTRAINT ck_frota_veiculos_placa
        CHECK (placa IS NULL OR length(placa) <= 12);
  END IF;
END
$$;

UPDATE public.frota_veiculos SET ativo = false WHERE ativo AND btrim(foto) = '';

INSERT INTO public.frota_veiculos
  (nome, modelo, passageiros, bagagem, foto, itens, ordem, ativo,
   categoria, capacidade_passageiros, malas)
SELECT * FROM (VALUES
  ('Carro pequeno', 'Fiat Cronos (ou similar)', 'Até 4 passageiros', '3 malas médias',
   '/frota/frota-1.jpeg',
   ARRAY['Ar-condicionado', 'Porta-malas fechado', 'Ideal para casais e duplas'],
   1, true, 'pequeno', 4, 3),
  ('Carro grande', 'VW T-Cross (ou similar)', 'Até 5 passageiros', '5 malas médias',
   '/frota/frota-6.jpeg',
   ARRAY['Ar-condicionado', 'Porta-malas amplo', 'Ideal para famílias e grupos'],
   2, true, 'grande', 5, 5)
) AS v(nome, modelo, passageiros, bagagem, foto, itens, ordem, ativo, categoria, capacidade_passageiros, malas)
WHERE NOT EXISTS (SELECT 1 FROM public.frota_veiculos WHERE ativo);

INSERT INTO public.frota_galeria (foto, alt, ordem, ativo)
SELECT * FROM (VALUES
  ('/frota/frota-1.jpeg', 'Fiat Cronos grafite em frente a um hotel em São Luís', 1, true),
  ('/frota/frota-7.jpeg', 'Fiat Cronos estacionado na orla de São Luís', 2, true),
  ('/frota/frota-6.jpeg', 'VW T-Cross branco e Fiat Cronos preto lado a lado', 3, true),
  ('/frota/frota-5.jpeg', 'Fiat Cronos e T-Cross em estacionamento', 4, true),
  ('/frota/frota-4.jpeg', 'Frota alinhada na estrada para os Lençóis Maranhenses', 5, true),
  ('/frota/frota-8.jpeg', 'Frota da Dias Transporte ao pôr do sol', 6, true),
  ('/frota/frota-3.jpeg', 'Fiat Cronos em frente a pousada em Barreirinhas', 7, true),
  ('/frota/frota-2.jpeg', 'Fiat Cronos em embarque noturno', 8, true)
) AS g(foto, alt, ordem, ativo)
WHERE NOT EXISTS (SELECT 1 FROM public.frota_galeria);
