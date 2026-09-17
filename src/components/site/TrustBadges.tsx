import { BadgeCheck, MessageCircle, Snowflake, Wallet } from "lucide-react";

const selos = [
  { icon: BadgeCheck, titulo: "Motoristas da casa", texto: "Equipe própria, rota conhecida" },
  { icon: Snowflake, titulo: "Veículos climatizados", texto: "Carros revisados e limpos" },
  { icon: MessageCircle, titulo: "Suporte no WhatsApp", texto: "Antes, durante e depois" },
  { icon: Wallet, titulo: "Sem taxa escondida", texto: "Preço fechado por veículo" },
];

export function TrustBadges() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {selos.map((s) => (
          <div key={s.titulo} className="flex items-start gap-3">
            {/* Achado revisando um print de referência trazido pelo usuário
                (site claro, ícone dentro de um círculo colorido) — mantendo
                o tema escuro do projeto, mas adotando o mesmo peso visual:
                círculo com tom translúcido do accent em vez de ícone solto. */}
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <s.icon className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{s.titulo}</p>
              <p className="text-xs text-muted-foreground">{s.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
