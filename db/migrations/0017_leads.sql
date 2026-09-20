-- Sprint 4 (auditoria do site): o formulário "Pedir orçamento" da página de
-- contato só abria o WhatsApp — se a pessoa desistisse antes de enviar, ou
-- mandasse de um celular sem WhatsApp instalado, o pedido sumia sem rastro
-- e o dono não tinha como saber quantas pessoas pediram orçamento.
--
-- Agora o pedido é gravado aqui (além de abrir o WhatsApp) e aparece na aba
-- "Leads" do admin, com status de acompanhamento.
--
-- LGPD: guarda só o necessário pra responder (nome, telefone, o que pediu).
-- O IP NÃO é guardado — só um hash dele (ip_hash), usado unicamente pro
-- limite de envios por hora contra spam.

CREATE TABLE IF NOT EXISTS public.leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  telefone      text NOT NULL,
  trecho        text,
  data_viagem   date,
  observacoes   text,
  origem        text NOT NULL DEFAULT 'contato',
  status        text NOT NULL DEFAULT 'novo',
  nota_interna  text,
  notificado_em timestamptz,
  ip_hash       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_status_valido CHECK (status IN ('novo', 'contatado', 'convertido', 'descartado')),
  CONSTRAINT leads_nome_tamanho CHECK (char_length(btrim(nome)) BETWEEN 2 AND 120),
  CONSTRAINT leads_telefone_tamanho CHECK (char_length(btrim(telefone)) BETWEEN 8 AND 30),
  CONSTRAINT leads_trecho_tamanho CHECK (trecho IS NULL OR char_length(trecho) <= 200),
  CONSTRAINT leads_obs_tamanho CHECK (observacoes IS NULL OR char_length(observacoes) <= 1000),
  CONSTRAINT leads_nota_tamanho CHECK (nota_interna IS NULL OR char_length(nota_interna) <= 1000)
);

CREATE INDEX IF NOT EXISTS ix_leads_status_data ON public.leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_leads_ip_data ON public.leads (ip_hash, created_at DESC);

-- Mesma função de updated_at já usada nas outras tabelas.
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
