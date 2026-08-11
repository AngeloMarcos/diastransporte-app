import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholders das listagens. As alturas replicam as do card real
 * (imagem 4/3 + corpo) para não haver salto de layout na troca.
 */
export function RotaCardSkeleton() {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <Skeleton className="h-6 w-3/4" />
        <div className="mt-3 flex gap-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-5/6" />
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
          <div className="w-1/2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-28" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </article>
  );
}

export function RotaGridSkeleton({ quantidade = 6 }: { quantidade?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: quantidade }).map((_, i) => (
        <RotaCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function VeiculoCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
        <Skeleton className="mt-4 h-4 w-48" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
      </div>
    </div>
  );
}

export function FrotaSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-6 md:grid-cols-2">
        <VeiculoCardSkeleton />
        <VeiculoCardSkeleton />
      </div>
      <Skeleton className="mt-16 h-8 w-40" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    </div>
  );
}

export function ListagemHeroSkeleton() {
  return (
    <section className="border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <Skeleton className="h-11 w-72 max-w-full" />
        <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
      </div>
    </section>
  );
}
