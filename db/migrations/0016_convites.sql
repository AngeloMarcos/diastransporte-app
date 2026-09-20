-- Sprint 3 (auditoria do site, A6): "Novo motorista" fazia o ADMIN digitar a
-- senha do motorista — o dono do painel passava a saber a senha de outra
-- pessoa, e a senha inicial viajava por WhatsApp em texto puro. Troca por
-- convite: o admin cria o cadastro, o sistema gera um link de uso único, e o
-- próprio motorista escolhe a senha ao abrir o link.
--
-- Sem e-mail de propósito: o app não tem provedor de e-mail e o dia a dia do
-- negócio é WhatsApp — o admin copia o link (ou clica em "enviar pelo
-- WhatsApp"). O mesmo mecanismo serve pra "esqueci minha senha" do motorista:
-- o admin gera um link novo.
--
-- Só o HASH do token é guardado (SHA-256, como as sessões): um dump do banco
-- ou do backup não entrega links utilizáveis. Validade de 7 dias, uso único.

CREATE TABLE IF NOT EXISTS public.convites (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  expira_em  timestamptz NOT NULL,
  usado_em   timestamptz,
  criado_por uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_convites_user ON public.convites (user_id);
CREATE INDEX IF NOT EXISTS ix_convites_expira ON public.convites (expira_em);
CREATE INDEX IF NOT EXISTS ix_convites_criado_por ON public.convites (criado_por);
