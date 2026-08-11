import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { formatBRL, type Rota } from "@/data/rotas";
import { Button } from "@/components/ui/button";

export function RotaCard({ rota }: { rota: Rota }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={rota.foto}
          alt={`Transfer ${rota.origem} para ${rota.destino}`}
          loading="lazy"
          decoding="async"
          width={800}
          height={600}
          className="absolute inset-0 size-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-sm bg-background/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest">
            {rota.ida_e_volta ? "Ida e volta" : "Somente ida"}
          </span>
          {rota.destaque && (
            <span className="rounded-sm bg-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
              {rota.destaque}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg leading-tight text-balance break-words">
          {rota.origem} <span className="text-primary">→</span> {rota.destino}
        </h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {rota.duracao}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" /> {rota.distancia}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{rota.resumo}</p>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">
              A partir de
            </span>
            <span className="font-display text-2xl">{formatBRL(rota.precoPequeno)}</span>
            <span className="ml-1 text-xs text-muted-foreground">/ veículo</span>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link to="/transfers/$rota" params={{ rota: rota.slug }}>
              Ver detalhes <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
