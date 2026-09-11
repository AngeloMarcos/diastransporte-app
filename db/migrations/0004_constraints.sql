-- Reforça no banco validações que hoje só existem em TypeScript (Zod nos
-- server functions, statusOpcoes em src/lib/status.ts) ou dentro do trigger
-- agendamentos_calcular_valor (que só valida periodo/carro quando essas
-- colunas específicas são tocadas, não em qualquer escrita). Sem isso, um
-- UPDATE que só mexe em `status` — ou um bug futuro em código de servidor —
-- pode gravar um valor fora do que a aplicação conhece, sem o banco reclamar.
-- Equivalente Supabase: supabase/migrations/20260907000000_agendamentos_constraints.sql
-- (mesmas checagens, aplicar lá manualmente — ver o comentário no topo
-- daquele arquivo sobre por que não foi aplicado automaticamente).
--
-- Auditado antes de escrever isto: banco desta VPS está vazio (0 linhas em
-- agendamentos e rotas), então não há dado existente que possa violar as
-- constraints abaixo.


ALTER TABLE public.agendamentos
  ADD CONSTRAINT ck_agendamentos_status
    CHECK (status IN ('pendente', 'confirmado', 'concluido', 'cancelado')),
  ADD CONSTRAINT ck_agendamentos_periodo
    CHECK (periodo IN ('dia', 'noite')),
  ADD CONSTRAINT ck_agendamentos_carro
    CHECK (carro IN ('pequeno', 'grande')),
  -- 1..20: mesma faixa já validada em Zod (vps/dados.functions.ts, reserva.passageiros).
  ADD CONSTRAINT ck_agendamentos_passageiros
    CHECK (passageiros BETWEEN 1 AND 20),
  -- Mesmos limites de tamanho já usados em Zod pro mesmo schema `reserva`.
  ADD CONSTRAINT ck_agendamentos_textos
    CHECK (
      length(trecho) BETWEEN 1 AND 200
      AND (embarque_local IS NULL OR length(embarque_local) <= 300)
      AND (observacoes IS NULL OR length(observacoes) <= 2000)
      AND (contato_nome IS NULL OR length(contato_nome) <= 120)
      AND (contato_telefone IS NULL OR length(contato_telefone) <= 40)
    );

-- Defende contra um preço negativo entrar via bug no admin ou edição manual
-- — nada hoje impede isso além da validação (fraca) do formulário.
ALTER TABLE public.rotas
  ADD CONSTRAINT ck_rotas_precos_nao_negativos
    CHECK (
      preco_pequeno >= 0
      AND (preco_grande IS NULL OR preco_grande >= 0)
      AND (preco_pequeno_noite IS NULL OR preco_pequeno_noite >= 0)
      AND (preco_grande_noite IS NULL OR preco_grande_noite >= 0)
    );

-- Índice que faltava: vpsContarMesmoCarroData (aviso de conflito de agenda,
-- mesmo carro + mesma data) filtra por (carro, data_viagem) e não tinha
-- nenhum índice cobrindo essas duas colunas juntas — só existiam índices
-- avulsos de status/user_id/rota_id/motorista_id, nenhum tocando carro ou
-- data_viagem.
CREATE INDEX IF NOT EXISTS agendamentos_carro_data_idx
  ON public.agendamentos (carro, data_viagem);

