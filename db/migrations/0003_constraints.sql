-- Continuação da revisão de schema feita no projeto irmão Dias Transporte
-- (db/migrations/0004 e 0005 de lá) — mesma lógica, agora aqui: reforça no
-- banco validações que hoje só existiam em TypeScript, cobrindo o que
-- ficou de fora quando usuarios/sessoes foram clonados de lá (o resto do
-- schema — fornecedores/empresas_clientes/pedidos — já nasceu com CHECK
-- constraints em 0001_init.sql, portadas junto com o schema original).
--
-- Auditado antes de escrever: 1 usuário, 0 sessões, 1 categoria_veiculo
-- nesta VPS agora, nenhum viola as constraints abaixo.

BEGIN;

ALTER TABLE public.usuarios
  ADD CONSTRAINT ck_usuarios_email_formato
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254),
  ADD CONSTRAINT ck_usuarios_textos
    CHECK (length(nome) <= 120 AND length(telefone) <= 40);

-- user_agent vem do header da requisição (não passa por Zod) — cap
-- defensivo; o código já trunca pra 300 chars antes de inserir
-- (vps/auth.server.ts), então isso nunca deveria disparar na prática.
ALTER TABLE public.sessoes
  ADD CONSTRAINT ck_sessoes_user_agent
    CHECK (length(user_agent) <= 500);

-- Achado revisando o schema: nada impedia salvar uma categoria com
-- capacidade 0 ou negativa — nem aqui, nem no Zod (categoriaSchema em
-- dados.functions.ts, corrigido junto com esta migration).
ALTER TABLE public.categorias_veiculo
  ADD CONSTRAINT ck_categorias_capacidade
    CHECK (capacidade_passageiros IS NULL OR capacidade_passageiros > 0);

COMMIT;
