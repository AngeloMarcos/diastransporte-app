import { Link, useRouter } from "@tanstack/react-router";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";

/**
 * Tela amigável de erro de carregamento: nunca mostra tela em branco nem
 * stack trace. Sempre oferece "tentar de novo" (recarrega o loader) e um
 * caminho de volta.
 */
export function ErroCarregamento({
  titulo,
  descricao,
  voltarPara = "/",
  voltarLabel = "Voltar ao início",
}: {
  titulo: string;
  descricao?: string;
  voltarPara?: "/" | "/transfers";
  voltarLabel?: string;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-2xl px-gutter py-section" role="alert">
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <TriangleAlert className="mx-auto size-8 text-primary" />
          <h1 className="mt-4 font-display text-fluid-2xl">{titulo}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {descricao ??
              "A conexão pode ter oscilado. Tente de novo em instantes — seus dados não foram perdidos."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button className="min-h-11" onClick={() => void router.invalidate()}>
              <RefreshCw className="size-4" /> Tentar de novo
            </Button>
            <Button asChild variant="secondary" className="min-h-11">
              <Link to={voltarPara}>{voltarLabel}</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
