# Auditoria e correções de banco — Dias Transporte

Auditoria feita contra o banco real. Resultado da comparação com `supabase/migrations/`:

## O que encontrei (verificado)

- **Drift de schema: quase nenhum.** Tabelas, colunas, triggers (`on_auth_user_created`, `*_updated_at`), funções (`has_role`, `handle_new_user`, `set_updated_at`) e as 13 policies ativas correspondem às migrations, incluindo a última (`20260814...` que trocou "Rotas ativas públicas" por "Rotas ativas públicas anon" + "Rotas ativas ou admin" e revogou `has_role` do papel anônimo). Nenhuma policy extra ou removida à mão.
- **Único drift real: o bucket de storage.** O bucket `rotas` existe, é **privado**, sem limite de tamanho e sem restrição de tipo de arquivo, e não está em nenhuma migration. As 4 policies de storage para admin (ver/enviar/atualizar/remover) estão versionadas, mas a criação do bucket não. Ele está vazio (0 arquivos).
- **Preço adulterável: confirmado.** O `INSERT` em `agendamentos` vem do navegador (`src/routes/carrinho.tsx`) com `valor` livre e a policy de INSERT só checa `user_id = auth.uid()`.
- **Agravante:** as 2 reservas existentes no banco foram gravadas com `rota_id` nulo, então hoje não há como ligar a reserva ao preço oficial da rota — só o texto do trecho.
- **`user_id` é `ON DELETE CASCADE`** para as contas — histórico realmente se perde ao excluir um usuário.
- **Zero índices** em `agendamentos` além da chave primária.
- **Papéis:** 3 admins (mentoark@gmail.com, angelobispofilho@gmail.com, stefanocatedral@hotmail.com) — todos esperados. `angelobispofilho@gmail.com` tem as duas linhas (`user` + `admin`), o que é normal pelo desenho da tabela. Nenhuma role órfã, nenhum perfil sem conta.

## O que vou fazer (uma migration por assunto, tudo versionado)

1. **Bucket versionado** — migration que cria o bucket `rotas` de forma idempotente, mantendo-o **privado**, com limite de 10 MB por arquivo e tipos permitidos apenas de imagem (jpeg, png, webp, avif). Aplica os mesmos limites ao bucket já existente.
2. **Preço confiável no servidor** — backfill do `rota_id` das 2 reservas antigas pelo trecho, `rota_id` passa a ser obrigatório, e um trigger `BEFORE INSERT OR UPDATE` em `agendamentos` recalcula o `valor` a partir de `public.rotas` conforme `carro` (pequeno/grande) e `periodo` (dia/noite), com a mesma regra de fallback do site (preço noturno cai no diurno quando não existe). Valor enviado pelo cliente é ignorado; quando a rota não tem preço para aquela combinação (ex.: carro grande "sob consulta"), grava `NULL` em vez de aceitar um número inventado.
3. **Histórico preservado** — `agendamentos.user_id` passa a `ON DELETE SET NULL` (coluna vira nullable; nome e telefone de contato já ficam salvos na própria linha). As policies continuam funcionando: linha sem dono fica visível apenas para administradores.
4. **Índices** — `user_id`, `rota_id`, `status` e `created_at DESC` em `agendamentos`.
5. **Sincronia de perfil** — não posso criar trigger em `auth.users` (schema gerenciado da plataforma; o trigger de criação de conta já existente é da integração). Em vez disso: sincronizo `profiles.email`/`nome` no login, dentro do fluxo de autenticação do app (`src/hooks/useAuth.tsx`), com um `upsert` na própria linha do usuário — coberto pelas policies atuais. Efeito prático igual: e-mail trocado no login seguinte já aparece atualizado no painel.
6. **Frontend alinhado** — `src/routes/carrinho.tsx` passa a exigir `rota_id` no envio e a exibir o valor que voltou do banco (fonte da verdade), e o carrinho garante `rotaId` nos itens.

## Detalhes técnicos

- Migrations em `supabase/migrations/`, uma por item, aplicadas via ferramenta de migration (com aprovação) — nada alterado só pelo editor.
- Trigger de preço: `SECURITY DEFINER`, `SET search_path = public`, lê `rotas` por `rota_id`; usa `RAISE EXCEPTION` quando a rota não existe ou está inativa.
- `ALTER TABLE ... DROP CONSTRAINT agendamentos_user_id_fkey` + recriação com `ON DELETE SET NULL`, junto de `ALTER COLUMN user_id DROP NOT NULL`.
- Após as migrations, `src/integrations/supabase/types.ts` é regenerado; ajusto o código que assume `user_id` não nulo (`admin.tsx`, `minhas-viagens.tsx`) na sequência.
- Verificação final: `npm run build` + typecheck e um teste de ponta a ponta tentando gravar um `valor` falso para confirmar que o banco corrige.
