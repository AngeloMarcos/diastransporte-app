import { Link } from "@tanstack/react-router";
import { Home, MapPinned, ShoppingBag, UserRound, LogIn } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCarrinho } from "@/lib/carrinho";

/**
 * Barra de navegação inferior estilo app — visível apenas no celular (< md).
 * No tablet e desktop a navegação volta para o header horizontal, que tem
 * espaço sobrando e fica menos apertado que 4 abas em 768px+.
 */

type Item = {
  key: string;
  label: string;
  icon: typeof Home;
  to: string;
  params?: Record<string, string>;
  badge?: number;
};

export function BottomNav() {
  const { user } = useAuth();
  const { itens } = useCarrinho();

  const itens: Item[] = [
    { key: "inicio", label: "Início", icon: Home, to: "/" },
    { key: "transfers", label: "Transfers", icon: MapPinned, to: "/transfers" },
    {
      key: "carrinho",
      label: "Carrinho",
      icon: ShoppingBag,
      to: "/carrinho",
      ...(itens.length > 0 ? { badge: itens.length } : {}),
    },
    user
      ? { key: "conta", label: "Minhas viagens", icon: UserRound, to: "/minhas-viagens" }
      : { key: "conta", label: "Entrar", icon: LogIn, to: "/auth" },
  ];

  return (
    <>
      {/* espaçador para o conteúdo não ficar sob a barra */}
      <div aria-hidden className="h-[calc(4.25rem+var(--safe-bottom))] md:hidden" />

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[var(--safe-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-4">
          {itens.map((item) => {
            const Icone = item.icon;
            return (
              <li key={item.key} className="min-w-0">
                <Link
                  to={item.to}
                  {...(item.params ? { params: item.params } : {})}
                  activeOptions={{ exact: item.to === "/" }}
                  className={cn(
                    "relative mx-auto flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] leading-none text-muted-foreground transition-colors",
                  )}
                  activeProps={{ className: "text-primary" }}
                >
                  <span className="relative">
                    <Icone className="size-6" />
                    {item.badge ? (
                      <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="w-full truncate text-center">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
