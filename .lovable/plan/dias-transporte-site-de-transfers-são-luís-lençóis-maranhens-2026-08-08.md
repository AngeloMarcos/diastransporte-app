# Dias Transporte — site de transfers (São Luís ↔ Lençóis Maranhenses)

Site vitrine + reserva por WhatsApp, visual escuro premium (grafite/preto com detalhe vermelho, inspirado no adesivo TR-S), usando as 8 fotos enviadas da frota.

## Páginas

- **/** (Home): hero em tela cheia com foto da frota, título "Do desembarque às dunas", busca simples de origem → destino; faixa de 4 selos de confiança (motoristas próprios, veículos climatizados, atendimento no WhatsApp, sem taxas escondidas); cards de rotas mais pedidas; seção de frota com as fotos; como funciona em 3 passos; depoimentos; CTA final.
- **/transfers**: catálogo completo de rotas com ordenação (mais pedidos, menor valor, maior valor), contador de resultados e filtro carro pequeno / carro grande.
- **/transfers/$rota**: detalhe da rota — galeria de fotos, preços dia/noite, o que está incluído, locais de embarque, FAQ em accordion, rotas relacionadas. Painel lateral fixo: seletor de data, horário (dia/noite), tipo de carro, nº de passageiros, total calculado e botão "Reservar pelo WhatsApp".
- **/frota**: as 8 fotos, tipos de veículo (Fiat Cronos = pequeno, VW T-Cross = grande), capacidade e bagagem.
- **/contato**: WhatsApp 55 98 8150-6268, área de atendimento, horários, formulário que abre o WhatsApp.

Rodapé em todas as páginas: logo, assinatura, WhatsApp, links úteis, copyright.

## Tarifário (dados do catálogo)

| Rota | Pequeno | Grande |
|---|---|---|
| São Luís ↔ Barreirinhas (dia) | R$ 650 | R$ 900 |
| São Luís ↔ Barreirinhas (noite 18h–5h) | R$ 650 | R$ 950 |
| São Luís ↔ Santo Amaro (dia) | R$ 700 | R$ 1.050 |
| Barreirinhas ↔ Santo Amaro | R$ 450 | R$ 550 |
| Barreirinhas → Parnaíba | R$ 850 | — |
| Barreirinhas → Barra Grande | R$ 950 | — |
| Barreirinhas → Jericoacoara | R$ 1.600 | — |
| Santo Amaro → Parnaíba | R$ 950 | — |
| Santo Amaro → Barra Grande | R$ 1.200 | — |
| Santo Amaro → Jericoacoara | R$ 1.700 | — |

Rotas sem preço de carro grande mostram "sob consulta" com CTA de WhatsApp.

## Reserva por WhatsApp

Nenhum banco de dados nesta versão. O botão monta uma mensagem pré-preenchida (rota, data, período, tipo de carro, passageiros, valor) e abre `wa.me/559881506268`.

## Detalhes técnicos

- Rotas TanStack em `src/routes/`; tarifário em `src/data/rotas.ts` (tipado) para alimentar listagem e detalhe.
- Fotos enviadas publicadas via Lovable Assets (ponteiros `.asset.json` em `src/assets/`), sem binários no repo.
- Tokens de cor/tipografia escuros em `src/styles.css` (grafite, preto, vermelho de acento); sem cores hardcoded nos componentes.
- `head()` próprio por rota com título, descrição e og/twitter em português.
