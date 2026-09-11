-- Achado revisando backend/banco: public.profiles (0001_init.sql, "pra
-- compatibilidade com o painel atual") nunca teve um único consumidor no
-- código VPS — o único código que lê "profiles" no repositório inteiro é o
-- lado Supabase (src/hooks/useAuth.tsx, src/lib/dados.ts, etc.), que usa o
-- cliente do Supabase e nunca toca este banco. Mantida sem uso, virava uma
-- segunda fonte de verdade pros dados de contato do usuário (usuarios vs.
-- profiles) esperando alguém confundir uma com a outra. É só uma VIEW —
-- remover não apaga dado nenhum, e recriar de volta é uma linha só se
-- algum código VPS futuro precisar dela de verdade.
DROP VIEW IF EXISTS public.profiles;
