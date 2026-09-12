import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Car, LayoutDashboard, LogIn, LogOut, Phone, UserRound } from "lucide-react";

import logo from "@/assets/logo.jpeg";
import { EMPRESA } from "@/data/rotas";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { encerrarSessaoAtual, useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/transfers", label: "Transfers" },
  { to: "/frota", label: "Frota" },
  { to: "/contato", label: "Contato" },
] as const;

export function Header() {
  const { user, isAdmin, isMotorista, carregando } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await encerrarSessaoAtual();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 pt-[var(--safe-top)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex min-w-0 min-h-11 items-center gap-2.5">
          <img
            src={logo}
            alt="Logo Dias Transporte"
            width={44}
            height={44}
            decoding="async"
            className="h-11 w-11 shrink-0 rounded-sm object-contain"
          />

          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-base tracking-wide">
              {EMPRESA.nome}
            </span>
            <span className="block truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {EMPRESA.base}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}

          {carregando ? (
            // Evita a "piscada de deslogado": até a sessão resolver, não
            // afirma nem Entrar nem o menu de conta — só um placeholder neutro.
            <Skeleton className="h-9 w-24 rounded-md" />
          ) : user ? (
            <>
              <Link
                to="/minhas-viagens"
                className="inline-flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                <UserRound className="size-4" /> Minhas viagens
              </Link>
              {isMotorista && (
                <Link
                  to="/motorista"
                  className="inline-flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{ className: "text-foreground" }}
                >
                  <Car className="size-4" /> Minhas corridas
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-primary"
                >
                  <LayoutDashboard className="size-4" /> Admin
                </Link>
              )}
              <Button size="sm" variant="secondary" onClick={() => void sair()}>
                <LogOut className="size-4" /> Sair
              </Button>
            </>
          ) : (
            <Button asChild size="sm" variant="secondary">
              <Link to="/auth">
                <LogIn className="size-4" /> Entrar
              </Link>
            </Button>
          )}

          <Button asChild size="sm" className="bg-whats text-whats-foreground hover:bg-whats/90">
            <a
              href={whatsappLink("Olá! Quero informações sobre transfer.")}
              target="_blank"
              rel="noreferrer"
            >
              <Phone className="size-4" /> WhatsApp
            </a>
          </Button>
        </nav>

        {/* Mobile: uma ação secundária (navegação fica na barra inferior) —
            duas quando a pessoa acumula admin + motorista, achado
            revisando UX: antes disso, quem era as duas coisas nunca tinha
            um atalho de 1 toque pra "Minhas corridas" no celular, já que
            "isAdmin" sempre ganhava sozinho aqui. */}
        {isAdmin ? (
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            {isMotorista && (
              <Link
                to="/motorista"
                aria-label="Minhas corridas"
                className="inline-grid size-11 shrink-0 place-items-center rounded-sm border border-border text-muted-foreground"
              >
                <Car className="size-5" />
              </Link>
            )}
            <Link
              to="/admin"
              aria-label="Painel admin"
              className="inline-grid size-11 shrink-0 place-items-center rounded-sm border border-border text-primary"
            >
              <LayoutDashboard className="size-5" />
            </Link>
          </div>
        ) : isMotorista ? (
          <Link
            to="/motorista"
            aria-label="Minhas corridas"
            className="inline-grid size-11 shrink-0 place-items-center rounded-sm border border-border text-primary md:hidden"
          >
            <Car className="size-5" />
          </Link>
        ) : (
          <a
            href={whatsappLink("Olá! Quero informações sobre transfer.")}
            target="_blank"
            rel="noreferrer"
            aria-label="Falar no WhatsApp"
            className="inline-grid size-11 shrink-0 place-items-center rounded-sm bg-whats text-whats-foreground md:hidden"
          >
            <Phone className="size-5" />
          </a>
        )}
      </div>
    </header>
  );
}
