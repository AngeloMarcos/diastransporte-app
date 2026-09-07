# Revisão de segurança, integridade e backend

Diagnóstico feito com leitura direta do banco (constraints, índices, policies, linter) e do código de acesso a dados. Abaixo, o que encontrei e o que proponho corrigir.

## 1. Falhas de permissão que quebram funcionalidade

- **Perfil do motorista não salva.** A tela `/motorista/perfil` faz update em `fornecedores`, mas não existe política de escrita para o papel motorista — só admin escreve. Hoje o botão salvar falha.
  Correção: política de update restrita ao próprio cadastro e apenas a nome e telefone, com trava que impede alterar cidade, categoria, ativo, notas internas ou vínculo de usuário.
- **Notas internas do admin sobre o motorista ficam visíveis para ele.** A política de leitura de `fornecedores` devolve a linha inteira ao próprio motorista, incluindo `observacoes_internas` (campo de uso interno do despachante).
  Correção: mover esse campo para uma tabela auxiliar apenas-admin, mesmo padrão já usado nas notas de pedidos.

## 2. Integridade dos dados

- **Duplicidade de pedidos importados.** Hoje são 362 pedidos, todos com código de reserva único, mas isso é garantido apenas pela checagem da tela de importação — não há restrição no banco. Duas importações simultâneas ou um cadastro manual criam duplicata.
  Correção: índice único parcial sobre o código de reserva do canal.
- **Histórico incompleto.** O histórico só é gravado pelas funções de transição e atribuição. Alteração direta de status ou de motorista feita pelo admin pela tabela passa sem registro.
  Correção: gatilho de auditoria que grava no histórico toda mudança de status ou de motorista, qualquer que seja o caminho.
- **Regras de negócio sem validação no banco.** Não há coerência exigida entre direção do pedido e campos obrigatórios, nem validação de e-mail/telefone, nem limite de tamanho de texto.
  Correção: constraints de validação (tamanho máximo, formato de e-mail, exigência de ponto de partida/chegada conforme a direção) e normalização de textos vazios para nulo.
- **Exclusão de motorista deixa usuário órfão.** Remover o fornecedor não remove o usuário de login nem o papel.
  Correção: rotina de servidor com verificação de admin que desativa/remove usuário, papel e cadastro de forma consistente.

## 3. Backend e superfícies expostas

- **Importação em massa roda inteiramente no navegador**, inserindo linhas cruas direto na tabela. Sem validação de servidor, um erro de mapeamento ou uso indevido do console grava dados fora do padrão.
  Correção: mover a inserção para uma função de servidor autenticada que revalida cada linha com schema (Zod), aplica a mesma normalização e devolve relatório de importados/ignorados.
- **Criação de motorista sem transação.** Se a criação do fornecedor falhar após criar o usuário, há rollback manual; se o rollback falhar, sobra lixo. Passa a ser uma operação única e com registro de falha.
- **Validação de entrada nos formulários do admin** (empresas, canais, categorias, pedidos) hoje é mínima; passa a usar schema compartilhado com as constraints do banco.

## 4. Performance

Faltam índices para consultas usadas nas telas: código de reserva, cidade de atuação do fornecedor, papel por usuário e busca por nome de passageiro.

## 5. Revisado e considerado adequado

- RLS ativo em todas as tabelas de domínio, sem acesso anônimo; grants explícitos apenas para usuários autenticados.
- Histórico e notas internas sem escrita direta pelo cliente.
- Proteção contra senhas vazadas já habilitada.
- Os três avisos do verificador sobre funções privilegiadas executáveis por usuários logados seguem aceitos: são o mecanismo de autorização do domínio e validam permissão internamente.

## Detalhes técnicos

Migrations separadas, em SQL padrão e portáveis para Postgres self-hosted:
1. Políticas de `fornecedores` e separação das notas internas.
2. Índice único parcial em `pedidos.codigo_reserva_canal` + índices de consulta.
3. Gatilho de auditoria em `pedidos` (status e fornecedor) gravando em `pedidos_historico`.
4. CHECK constraints e normalização de campos.

No frontend/servidor: nova função `importarPedidos` em `src/lib/pedidos.functions.ts` (validação Zod + inserção em lote com verificação de admin), ajuste de `import-pedidos-dialog.tsx` para consumi-la, função de exclusão segura de motorista e schemas de validação compartilhados nos formulários.