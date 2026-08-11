# Correção definitiva da tela offline no site publicado

## Diagnóstico confirmado

- O endereço publicado responde com HTTP 200 e abre a página inicial normalmente em um navegador limpo.
- O domínio ainda entrega `/sw.js` e mantém caches controlados pelo Workbox.
- Portanto, o problema restante está nos celulares/navegadores que receberam o service worker antigo e continuam sob controle dele; alterar apenas a lógica do novo PWA não garante a recuperação desses visitantes.

## Implementação

1. **Desativar o service worker de app-shell**
   - Remover a geração automática do worker pelo `vite-plugin-pwa`.
   - Remover o registro do worker feito pela aplicação.
   - Manter o `manifest.webmanifest` e os ícones, preservando “Adicionar à tela inicial”, mas sem modo offline nesta etapa.

2. **Publicar um worker de limpeza no mesmo caminho `/sw.js`**
   - Substituir o worker antigo por um kill switch compatível com navegadores já controlados.
   - Ao instalar/ativar, apagar somente os caches pertencentes ao app (`workbox`, `shell-html` e `shell-assets`), assumir as abas abertas, recarregá-las e cancelar o próprio registro.
   - Não tocar em workers/caches de notificações ou terceiros.

3. **Eliminar caminhos que podem recriar o problema**
   - Retirar a recuperação baseada em novo registro presente na página offline.
   - Remover a dependência PWA que não será mais utilizada, evitando que outro `sw.js` seja gerado sobre o kill switch.

## Validação e entrega

- Executar typecheck, lint e build de produção.
- Conferir no artefato que `/sw.js` contém o kill switch, e não Workbox/`NetworkFirst`.
- Testar em navegador com registro/cache antigo simulado: abrir o site, receber a atualização, limpar o controle e carregar a home online.
- Testar em navegador limpo que a home abre sem registrar um novo service worker.
- Publicar a correção no endereço `wander-book-craft.lovable.app` e verificar uma vez o arquivo `/sw.js` servido pela publicação.

## Resultado esperado

Quem estiver preso na tela “Você está offline” será liberado assim que o navegador buscar o novo `/sw.js`; depois disso, o site continuará instalável pela tela inicial, mas não tentará operar offline nem poderá voltar a sequestrar a navegação.
