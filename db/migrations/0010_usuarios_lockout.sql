-- Pedido do usuário: sistema de usuários "seguro, bem feito" na fusão —
-- achado revisando autenticar() em vps/auth.server.ts: não existia NENHUM
-- limite de tentativas de login. bcrypt (custo 12) atrasa cada tentativa
-- alguns milissegundos, mas isso não é controle de segurança nenhum — um
-- atacante paciente ou distribuído consegue tentar senhas comuns
-- indefinidamente contra qualquer conta, sem nunca ser bloqueado.

BEGIN;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS tentativas_falhas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_ate timestamptz;

COMMIT;
