-- Atribuição de motorista a um agendamento: coluna + policies que somam
-- (permissivas, combinam por OR) às já existentes em public.agendamentos.
ALTER TABLE public.agendamentos
  ADD COLUMN motorista_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX agendamentos_motorista_id_idx ON public.agendamentos (motorista_id);

CREATE POLICY "Motorista vê corridas atribuídas" ON public.agendamentos
  FOR SELECT TO authenticated
  USING (motorista_id = auth.uid());

-- RLS aqui é por linha, não por coluna: garante que o motorista só toca a
-- própria corrida atribuída, mas não impede um UPDATE bruto mudando outros
-- campos dela (mesmo modelo de confiança já aceito para o cliente cancelar
-- a própria viagem — a app nunca expõe ao motorista um update genérico, só
-- a transição de status pra "concluido").
CREATE POLICY "Motorista conclui a própria corrida" ON public.agendamentos
  FOR UPDATE TO authenticated
  USING (motorista_id = auth.uid())
  WITH CHECK (motorista_id = auth.uid());
