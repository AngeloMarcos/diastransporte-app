import { createFileRoute } from "@tanstack/react-router";

import { IdentificacaoEmpresa, Lista, PaginaTexto, Secao } from "@/components/site/PaginaTexto";
import { EMPRESA } from "@/data/rotas";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — Dias Transporte" },
      {
        name: "description",
        content:
          "Quais dados a Dias Transporte coleta, para que usa, com quem compartilha e como você exerce seus direitos pela LGPD.",
      },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <PaginaTexto
      titulo="Política de privacidade"
      introducao="Explicamos em linguagem simples quais dados pessoais usamos para atender você e como cuidamos deles, conforme a Lei Geral de Proteção de Dados (LGPD)."
      atualizadoEm="20 de setembro de 2026"
    >
      <Secao titulo="Quem é o responsável pelos dados">
        <IdentificacaoEmpresa />
        <p>Contato para assuntos de privacidade: WhatsApp {EMPRESA.whatsappLabel}.</p>
      </Secao>

      <Secao titulo="Quais dados coletamos e por quê">
        <Lista
          itens={[
            <>
              <strong>Pedido de orçamento (página Contato):</strong> nome, telefone, trecho, data e
              observações que você escrever. Usamos para responder ao seu pedido.
            </>,
            <>
              <strong>Conta e reservas:</strong> nome, e-mail, telefone e a senha (guardada apenas
              de forma criptografada, nunca em texto). Junto vêm os dados da viagem: trecho, data,
              horário, local de embarque, número de passageiros e observações. Usamos para confirmar
              e realizar o transfer.
            </>,
            <>
              <strong>Segurança:</strong> para limitar envios automáticos (spam), guardamos apenas
              uma identificação embaralhada do seu acesso, que não permite descobrir o seu IP.
            </>,
          ]}
        />
        <p>
          Não pedimos documentos, dados de cartão nem dados sensíveis pelo site. O site não faz
          cobrança online.
        </p>
      </Secao>

      <Secao titulo="Com quem compartilhamos">
        <Lista
          itens={[
            "Motoristas e parceiros escalados para a sua viagem recebem só o necessário para a corrida: nome, telefone, local e horário de embarque.",
            "Prestadores de hospedagem e infraestrutura que mantêm o site no ar.",
            "Autoridades, quando a lei exigir.",
          ]}
        />
        <p>Não vendemos nem alugamos dados pessoais.</p>
      </Secao>

      <Secao titulo="Cookies e armazenamento no navegador">
        <Lista
          itens={[
            "Cookie de sessão: só existe se você entrar na sua conta; serve para manter o login e é essencial ao funcionamento.",
            "Armazenamento local: guarda o carrinho de reservas no seu aparelho até você finalizar ou limpar.",
            "Não usamos cookies de publicidade nem ferramentas de análise de comportamento.",
          ]}
        />
      </Secao>

      <Secao titulo="Serviços de terceiros">
        <Lista
          itens={[
            "WhatsApp (Meta): ao abrir a conversa a partir do site, você passa a usar o serviço do WhatsApp, que tem a própria política de privacidade.",
            "As fontes e as imagens do site são servidas pelo próprio site; não carregamos scripts de anúncios nem de rastreamento de terceiros.",
          ]}
        />
      </Secao>

      <Secao titulo="Por quanto tempo guardamos">
        <p>
          Guardamos os dados pelo tempo necessário para atender você, manter o histórico das suas
          viagens e cumprir obrigações legais. Quando deixarem de ser necessários, são apagados ou
          anonimizados.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        <p>Pela LGPD você pode, a qualquer momento, pedir:</p>
        <Lista
          itens={[
            "confirmação de que tratamos seus dados e acesso a eles;",
            "correção de dados incompletos ou desatualizados;",
            "eliminação dos dados, quando não houver obrigação legal de mantê-los;",
            "informações sobre com quem os compartilhamos;",
            "revogação de consentimentos que você tenha dado.",
          ]}
        />
        <p>
          Para exercer qualquer um deles, chame a gente no WhatsApp {EMPRESA.whatsappLabel}.
          Respondemos assim que possível.
        </p>
      </Secao>

      <Secao titulo="Mudanças nesta política">
        <p>
          Se algo importante mudar, atualizamos esta página e a data no topo. Recomendamos
          consultá-la de vez em quando.
        </p>
      </Secao>
    </PaginaTexto>
  );
}
