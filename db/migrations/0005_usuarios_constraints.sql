-- Continuação da revisão de schema iniciada em 0004_constraints.sql, agora
-- em usuarios/sessoes. Só existe do lado VPS: no Lovable Cloud quem valida
-- e-mail no cadastro é o GoTrue (auth.users), que este projeto não controla
-- — não há equivalente Supabase pra este arquivo.
--
-- Mesma lógica de "reforçar no banco o que só existia em Zod": o cadastro
-- (sessao.functions.ts) já valida e-mail/nome/telefone antes de inserir,
-- mas nada impede um INSERT direto (ex.: db/criar-admins.mjs, ou um bug
-- futuro em código de servidor) de gravar um e-mail sem "@" ou um
-- user_agent gigante. Mesmo padrão de CHECK de formato/tamanho já usado em
-- car-fleet-co (fornecedores/empresas_clientes).
--
-- Auditado antes de escrever: 3 usuários e 0 sessões nesta VPS agora, nenhum
-- viola as constraints abaixo.

BEGIN;

ALTER TABLE public.usuarios
  ADD CONSTRAINT ck_usuarios_email_formato
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254),
  ADD CONSTRAINT ck_usuarios_textos
    CHECK (length(nome) <= 120 AND length(telefone) <= 40);

-- user_agent vem do header da requisição (não passa por Zod nenhum) — cap
-- defensivo contra um cliente mandando um header absurdamente grande.
ALTER TABLE public.sessoes
  ADD CONSTRAINT ck_sessoes_user_agent
    CHECK (length(user_agent) <= 500);

COMMIT;
