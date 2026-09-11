-- Achado revisando drift entre os schemas VPS e Supabase (revisão de
-- backend/banco pedida pelo usuário, Sprint 3): agendamentos.rota_id virou
-- NOT NULL em 20260809170945_...sql, mas a FK criada em
-- 20260809164251_...sql:99 continuou com ON DELETE SET NULL. Apagar uma
-- rota que ainda tem agendamentos faz o Postgres tentar SET NULL em
-- rota_id, que falha contra a constraint NOT NULL — o admin via um erro
-- confuso ("null value in column rota_id violates not-null constraint")
-- em vez de um erro de violação de FK limpo. O lado VPS já não tem esse
-- problema (db/migrations/0001_init.sql usa REFERENCES simples, sem ON
-- DELETE SET NULL) — esta migration alinha o Supabase com o mesmo
-- comportamento.
ALTER TABLE public.agendamentos
  DROP CONSTRAINT IF EXISTS agendamentos_rota_id_fkey;

ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_rota_id_fkey
  FOREIGN KEY (rota_id) REFERENCES public.rotas (id);
