-- Novo valor de app_role para o papel de motorista (atribuição de corridas).
-- Em arquivo separado de propósito: adicionar um valor a um enum não pode
-- ser usado na mesma transação/migration em que ele é consumido.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'motorista';
