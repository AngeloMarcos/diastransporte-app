import { Link } from "@tanstack/react-router";
import { Home, MapPinned, ShoppingBag, UserRound, LogIn } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
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

function ItemLink({ item }: { item: Item }) {
  const Icone = item.icon;
  return (
    <Link
      to={item.to}
      {...(item.params ? { params: item.params } : {})}
      activeOptions={{ exact: item.to === "/" }}
      className="relative mx-auto flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] leading-none text-muted-foreground transition-colors"
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
  );
}

export function BottomNav() {
  const { user, carregando } = useAuth();
  const { itens: itensCarrinho } = useCarrinho();

  const itensFixos: Item[] = [
    { key: "inicio", label: "Início", icon: Home, to: "/" },
    { key: "transfers", label: "Transfers", icon: MapPinned, to: "/transfers" },
    {
      key: "carrinho",
      label: "Carrinho",
      icon: ShoppingBag,
      to: "/carrinho",
      ...(itensCarrinho.length > 0 ? { badge: itensCarrinho.length } : {}),
    },
  ];

  const itemConta: Item = user
    ? { key: "conta", label: "Minhas viagens", icon: UserRound, to: "/minhas-viagens" }
    : { key: "conta", label: "Entrar", icon: LogIn, to: "/auth" };

  return (
    <>
      {/* espaçador para o conteúdo não ficar sob a barra */}
      <div aria-hidden className="h-[calc(4.25rem+var(--safe-bottom))] md:hidden" />

      <nav
        aria-label="Navegação principal"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[var(--safe-bottom)] backdrop-blur md:hidden",
        )}
      >
        <ul className="grid grid-cols-4">
          {itensFixos.map((item) => (
            <li key={item.key} className="min-w-0">
              <ItemLink item={item} />
            </li>
          ))}
          <li className="min-w-0">
            {carregando ? (
              // Evita afirmar "Entrar" pra quem já está logado (e vice-versa)
              // antes da sessão resolver — mesmo cuidado do Header.
              <div className="mx-auto flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 px-1 py-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="mt-1 h-2.5 w-10" />
              </div>
            ) : (
              <ItemLink item={itemConta} />
            )}
          </li>
        </ul>
      </nav>
    </>
  );
}
