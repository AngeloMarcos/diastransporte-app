import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle } from "lucide-react";
import { EMPRESA } from "@/data/rotas";
import { whatsappLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 items-center rounded-sm bg-primary px-2 font-display text-lg leading-none text-primary-foreground">
              DT
            </span>
            <span className="font-display text-lg tracking-wide">{EMPRESA.nome}</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            {EMPRESA.assinatura}. Transfers particulares entre São Luís, Barreirinhas, Santo Amaro e
            toda a Rota das Emoções.
          </p>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Instagram className="size-4" /> @diastransporte
          </a>
        </div>

        <div>
          <h3 className="text-sm tracking-widest text-muted-foreground">Navegação</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/transfers" className="text-muted-foreground hover:text-foreground">
                Todos os transfers
              </Link>
            </li>
            <li>
              <Link to="/frota" className="text-muted-foreground hover:text-foreground">
                Nossa frota
              </Link>
            </li>
            <li>
              <Link to="/contato" className="text-muted-foreground hover:text-foreground">
                Contato e atendimento
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm tracking-widest text-muted-foreground">Atendimento</h3>
          <p className="mt-4 text-sm text-muted-foreground">
            {EMPRESA.whatsappLabel}
            <br />
            Todos os dias, 6h às 22h
          </p>
          <Button asChild className="mt-4 w-full bg-whats text-whats-foreground hover:bg-whats/90">
            <a href={whatsappLink("Olá! Quero reservar um transfer.")} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          </Button>
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {EMPRESA.nome} — Tarifário temporada 2026. Valores por veículo,
        sujeitos a confirmação.
      </div>
    </footer>
  );
}
