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
    <div className="mx-auto max-w-6xl px-4 py-section">
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
      <div className="mx-auto max-w-6xl px-4 py-section">
        <Skeleton className="h-11 w-72 max-w-full" />
        <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
      </div>
    </section>
  );
}

/** Home: hero cheio de altura + badges + grade de rotas. */
export function HomeSkeleton() {
  return (
    <>
      <section className="relative flex min-h-[88vh] items-center border-b border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-section">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-5 h-14 w-full max-w-2xl" />
          <Skeleton className="mt-3 h-14 w-2/3 max-w-xl" />
          <Skeleton className="mt-6 h-4 w-full max-w-xl" />
          <Skeleton className="mt-2 h-4 w-3/4 max-w-md" />
          <Skeleton className="mt-8 h-[4.75rem] w-full max-w-xl rounded-lg" />
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-section">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        <div className="mt-8">
          <RotaGridSkeleton quantidade={3} />
        </div>
      </section>
    </>
  );
}

/** Detalhe da rota: galeria, blocos de info, tarifário e card de reserva. */
export function RotaDetalheSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <div>
        <Skeleton className="h-11 w-4/5 max-w-lg" />
        <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-44" />
          ))}
        </div>

        {/* galeria */}
        <Skeleton className="mt-6 aspect-[16/10] w-full rounded-lg" />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[5.75rem] w-full rounded-lg" />
          ))}
        </div>

        <Skeleton className="mt-12 h-8 w-48" />
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-11/12" />
        <Skeleton className="mt-2 h-4 w-4/5" />

        {/* tarifário */}
        <Skeleton className="mt-10 h-8 w-56" />
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <Skeleton className="h-11 w-full rounded-none" />
          <div className="border-t border-border">
            <Skeleton className="h-12 w-full rounded-none" />
          </div>
          <div className="border-t border-border">
            <Skeleton className="h-12 w-full rounded-none" />
          </div>
        </div>

        <Skeleton className="mt-10 h-8 w-32" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-3/4" />
          ))}
        </div>
      </div>

      {/* card de reserva */}
      <aside>
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-10 w-40" />
          <Skeleton className="mt-2 h-3 w-48" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-6 h-16 w-full" />
          <Skeleton className="mt-4 h-11 w-full" />
          <Skeleton className="mt-2 h-11 w-full" />
          <Skeleton className="mt-2 h-11 w-full" />
        </div>
      </aside>
    </div>
  );
}

/** Minhas viagens: cabeçalho + cards de reserva empilhados. */
export function MinhasViagensSkeleton({ itens = 3 }: { itens?: number }) {
  return (
    <div className="mt-8 space-y-4">
      {Array.from({ length: itens }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-6 w-48 max-w-[60%]" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="mt-3 h-4 w-64" />
          <Skeleton className="mt-2 h-4 w-40" />
          <Skeleton className="mt-4 h-9 w-36" />
        </div>
      ))}
    </div>
  );
}

/** Carrinho: itens empilhados + campos de contato + resumo. */
export function CarrinhoSkeleton({ itens = 2 }: { itens?: number }) {
  return (
    <div className="mt-6 space-y-4">
      {Array.from({ length: itens }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-6 w-52 max-w-[60%]" />
            <Skeleton className="size-9" />
          </div>
          <Skeleton className="mt-3 h-4 w-40" />
          <Skeleton className="mt-2 h-4 w-48" />
          <Skeleton className="mt-4 h-7 w-28" />
        </div>
      ))}
      <div className="grid gap-4 pt-4 sm:grid-cols-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}
