// Moldura das páginas de texto do site (termos, privacidade, cancelamento,
// sobre): cabeçalho, coluna de leitura e rodapé — o texto em si fica em cada rota.
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { EMPRESA } from "@/data/rotas";

export function PaginaTexto({
  titulo,
  introducao,
  atualizadoEm,
  children,
}: {
  titulo: string;
  introducao?: string;
  /** Data por extenso da última revisão do texto; some quando não se aplica (ex.: "Sobre"). */
  atualizadoEm?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-gutter py-section">
        <h1 className="font-display text-fluid-2xl">{titulo}</h1>
        {introducao && <p className="mt-3 text-muted-foreground">{introducao}</p>}
        {atualizadoEm && (
          <p className="mt-2 text-xs text-muted-foreground">Última atualização: {atualizadoEm}</p>
        )}
        <div className="mt-8">{children}</div>
        <nav
          aria-label="Outras páginas"
          className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground"
        >
          <Link to="/termos" className="hover:text-foreground">
            Termos de uso
          </Link>
          <Link to="/privacidade" className="hover:text-foreground">
            Privacidade
          </Link>
          <Link to="/cancelamento" className="hover:text-foreground">
            Cancelamento
          </Link>
          <Link to="/sobre" className="hover:text-foreground">
            Sobre nós
          </Link>
        </nav>
      </main>
      <Footer />
    </div>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="font-display text-fluid-lg">{titulo}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function Lista({ itens }: { itens: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {itens.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Quem responde pelo site, com razão social/CNPJ só se o dono já os informou. */
export function IdentificacaoEmpresa() {
  return (
    <p>
      {EMPRESA.razaoSocial ? `${EMPRESA.razaoSocial}, ` : ""}
      {EMPRESA.nome}
      {EMPRESA.cnpj ? `, CNPJ ${EMPRESA.cnpj}` : ""}, com base em {EMPRESA.base}.
    </p>
  );
}
