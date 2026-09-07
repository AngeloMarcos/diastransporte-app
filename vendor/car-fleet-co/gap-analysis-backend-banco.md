# Gap analysis — Banco de dados e Backend (car-fleet-co)

Data: 2026-07-27
Objetivo: lista do que falta implementar/corrigir antes da mudança para VPS, para orientar a implementação via Antigravity/Gemini.

---

## 1. Bugs que quebram funcionalidade hoje (corrigir primeiro)

### 1.1 Histórico de status nunca aparece (bug de nome de coluna)
`src/routes/_authenticated.admin.pedidos.$id.tsx` busca `pedidos_historico` e ordena por `created_at`. A tabela real (migration `20260715002205`) não tem `created_at` — a coluna de timestamp se chama `alterado_em`. A query falha silenciosamente (o erro não é tratado) e a seção "Histórico de status" sempre mostra "Sem alterações registradas.", mesmo com transições acontecendo.
**Correção:** trocar `created_at` por `alterado_em` na query e no tipo `Historico`, e também exibir `alterado_por` se fizer sentido.

### 1.2 Motorista não consegue editar o próprio perfil (falta policy de RLS)
`src/routes/_authenticated.motorista.perfil.tsx` chama `supabase.from("fornecedores").update({ nome, telefone }).eq("id", f.id)`. Mas as RLS policies de `fornecedores` (migration `20260715002205`) só permitem UPDATE para quem tem `role = admin` — não existe nenhuma policy que permita ao próprio motorista (`user_id = auth.uid()`) atualizar sua linha. Hoje esse botão "Salvar perfil" falha com erro de RLS.
**Correção:** nova migration adicionando policy `fornecedores motorista update proprio perfil` — `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())` — e, como RLS não limita colunas, um trigger tipo `pedidos_motorista_guard` bloqueando alteração de qualquer coluna além de `nome`/`telefone` (impedir que o motorista mude `ativo`, `cidade_atuacao`, `categoria_veiculo_id`, `observacoes_internas`, `user_id`).

### 1.3 `canais_venda.tipo`: frontend oferece valores que violam o CHECK constraint
A migration cria `canais_venda.tipo` com `CHECK (tipo IN ('ota', 'site_proprio', 'parceiro', 'outro'))`. O formulário em `_authenticated.admin.canais.tsx` oferece as opções `ota`, `agencia`, `direto`, `outro` — `agencia` e `direto` não existem no CHECK e o insert/update vai falhar.
**Correção:** alinhar as opções do `<Select>` aos valores permitidos pelo banco (`ota`, `site_proprio`, `parceiro`, `outro`) — ou alterar o CHECK constraint via nova migration se os valores de negócio reais forem outros. Decidir qual dos dois lados está certo antes de implementar.

---

## 2. CRUD incompleto (dados existem, tela não cobre o ciclo todo)

### 2.1 Motoristas (fornecedores): só tem "criar" e "listar"
`_authenticated.admin.motoristas.tsx` cria motorista e lista, mas não tem: editar dados (nome, telefone, cidade de atuação, categoria de veículo, observações internas), ativar/inativar (padrão usado em empresas/canais/categorias), nem resetar senha de um motorista que esqueceu a senha. Isso é uma lacuna real de "CRUD completo de fornecedores" pedido no escopo original.
**Falta implementar:** modal de edição (reaproveitando o padrão dos outros cadastros), toggle de `ativo`, e uma ação admin de reset de senha (via `supabaseAdmin.auth.admin.updateUserById` no server, análogo a `createMotorista`).

### 2.2 Pedidos: não dá para editar os dados da corrida depois de criada
A tela de detalhe do pedido (`_authenticated.admin.pedidos.$id.tsx`) só permite editar `observacoes_internas`, trocar status e atribuir motorista. Campos como hotel, ponto de partida/chegada, número do voo, data/hora de encontro, categoria de veículo, código de reserva do canal e **`codigo_fornecedor_reserva`** (que nem aparece no formulário de criação) não têm nenhuma tela de edição.
**Falta implementar:** formulário de edição do pedido na tela de detalhe (reaproveitando os campos do `NovoPedidoDialog`), e adicionar `codigo_fornecedor_reserva` ao formulário de criação.

### 2.3 Gestão de admins depois do bootstrap
Só existe um caminho para criar o primeiro admin (aba "Primeiro admin" na tela de login, que só funciona enquanto não existir nenhum admin). Depois disso, não há tela para promover outro usuário a admin — só é possível via SQL direto. Se a operação vai ter mais de um despachante, isso vai faltar.
**Falta decidir/implementar:** uma tela (ou seção) em `/admin` para promover/rebaixar admins, reaproveitando a função `promoteToAdmin` já existente no backend (hoje só é chamada pela tela de bootstrap).

---

## 3. Consistência de grants (não é bug ativo, mas está inconsistente)

A migration `20260715004341` deu `GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_historico` e `...user_roles... TO authenticated`, mas as RLS policies dessas tabelas só cobrem SELECT (e, no caso de `user_roles`, INSERT/UPDATE/DELETE só para admin via policy `ALL`). Como não há policy permissiva de INSERT/UPDATE/DELETE para motorista em `pedidos_historico`, na prática ninguém sem ser admin consegue escrever ali — mas o grant amplo é enganoso e vale reduzir para o que é realmente necessário (`SELECT` apenas), para não depender só da RLS como camada de defesa.

---

## 4. Coisas que a spec original pedia e não foram encontradas no código

- **Exportação CSV no portal do motorista:** existe na tela Admin de Pedidos, mas não na tela "Pesquisar Pedidos" do motorista. A spec original não pede isso explicitamente para o motorista, então não é bloqueante — mas vale confirmar se é esperado.
- **"Tipo de pedido" como filtro na pesquisa do motorista:** a spec lista esse filtro para a tela do motorista; hoje a tela usa Direção (IN/OUT) no lugar. Se "tipo de pedido" for algo diferente de direção, esse filtro está faltando.
- **Reenvio/geração de acesso do motorista:** o admin define a senha do motorista manualmente na criação (texto puro no formulário). Não há fluxo de "enviar credenciais" nem de "motorista troca senha no primeiro acesso" — está fora de escopo conforme o prompt original (WhatsApp/e-mail automático fica para depois), mas o texto puro da senha passando pelo formulário do admin é um ponto de atenção operacional (quem cria a senha sabe a senha do motorista).

---

## 5. O que já está correto e não precisa mexer

- Schema (tabelas, colunas, índices, enums) bate 100% com a especificação original.
- `fn_transicionar_status` e `fn_atribuir_motorista` implementam a máquina de estados corretamente, com auditoria em `pedidos_historico`.
- RLS de `pedidos` (admin vê tudo; motorista só os próprios pedidos; motorista só pode alterar `observacao_motorista` via UPDATE direto, todo o resto passa pela função) está correta e tem defesa em profundidade (trigger `pedidos_motorista_guard`).
- CRUD de `empresas_clientes`, `canais_venda` (exceto o bug de valores do `tipo`) e `categorias_veiculo` está completo (criar, editar, ativar/inativar).
- Filtros da listagem de pedidos do Admin cobrem exatamente o que a spec pediu: código, canal, tipo de data (atividade/emissão/alteração), intervalo de datas, status, empresa, fornecedor, direção, passageiro, cidade.
- Exportação CSV client-side no Admin, dashboard (contagem por status, pedidos de hoje, sem motorista), voucher em PDF client-side (jsPDF) — todos funcionando.
- Login com redirecionamento por role (`/admin` vs `/motorista`) funciona corretamente.

---

## Ordem sugerida de implementação

1. Corrigir os 3 bugs da seção 1 (histórico, RLS de perfil do motorista, valores de `tipo` em canais) — são baixo esforço e alto impacto, um deles (RLS) é uma migration nova.
2. Completar CRUD de motoristas (editar, ativar/inativar, reset de senha) — seção 2.1.
3. Adicionar edição de pedido e o campo `codigo_fornecedor_reserva` no formulário de criação — seção 2.2.
4. Decidir e, se necessário, implementar gestão de admins pós-bootstrap — seção 2.3.
5. Revisar os grants de `pedidos_historico`/`user_roles` por higiene (seção 3).
