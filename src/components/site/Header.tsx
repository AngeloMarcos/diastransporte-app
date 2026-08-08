import { Link } from "@tanstack/react-router";
import { Menu, Phone } from "lucide-react";
import { useState } from "react";
import { EMPRESA } from "@/data/rotas";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/transfers", label: "Transfers" },
  { to: "/frota", label: "Frota" },
  { to: "/contato", label: "Contato" },
] as const;

export function Header() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 items-center rounded-sm bg-primary px-2 font-display text-lg font-semibold leading-none text-primary-foreground">
            DT
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base tracking-wide">{EMPRESA.nome}</span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {EMPRESA.base}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
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
          <Button asChild size="sm" className="bg-whats text-whats-foreground hover:bg-whats/90">
            <a href={whatsappLink("Olá! Quero informações sobre transfer.")} target="_blank" rel="noreferrer">
              <Phone className="size-4" /> WhatsApp
            </a>
          </Button>
        </nav>

        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label="Abrir menu"
          className="md:hidden rounded-sm border border-border p-2 text-foreground"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {aberto && (
        <div className="border-t border-border bg-card px-4 py-3 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setAberto(false)}
                className="text-sm uppercase tracking-wide text-muted-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {l.label}
              </Link>
            ))}
            <Button asChild size="sm" className="bg-whats text-whats-foreground hover:bg-whats/90">
              <a href={whatsappLink("Olá! Quero informações sobre transfer.")} target="_blank" rel="noreferrer">
                <Phone className="size-4" /> Falar no WhatsApp
              </a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
