-- Papel de motorista + atribuição de corridas — equivalente VPS de
-- supabase/migrations/20260902120000_add_motorista_role.sql e
-- .../20260902120100_motorista_atribuicao.sql.
-- Aqui não há enum de papéis (usuarios.admin já é um booleano simples),
-- então o motorista segue o mesmo formato: mais um booleano.


ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS motorista boolean NOT NULL DEFAULT false;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS motorista_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS agendamentos_motorista_id_idx ON public.agendamentos (motorista_id);

