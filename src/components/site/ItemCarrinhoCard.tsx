import { useRef, useState } from "react";
import { Trash2, MapPin, Clock, UserRound, Car } from "lucide-react";

import type { ItemCarrinho } from "@/lib/carrinho";
import { formatBRL } from "@/data/rotas";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Item do carrinho com deslizar-para-remover (arrastar para a esquerda).
 * O botão de lixeira fica sempre visível — o gesto é apenas um atalho,
 * nunca a única forma de remover.
 *
 * Achado revisando UX: nem o gesto nem o botão pediam confirmação — um
 * arrasto diagonal durante a rolagem de uma lista longa no celular podia
 * apagar uma reserva sem querer, sem desfazer. Os dois agora só ABREM a
 * confirmação; quem remove de verdade é o botão dentro do AlertDialog.
 */
export function ItemCarrinhoCard({
  item,
  onRemover,
}: {
  item: ItemCarrinho;
  onRemover: (id: string) => void;
}) {
  const [deslocamento, setDeslocamento] = useState(0);
  const deslocamentoRef = useRef(0);
  const inicio = useRef<number | null>(null);
  const arrastando = useRef(false);
  const [confirmando, setConfirmando] = useState(false);

  const LIMITE = 96;

  function mover(valor: number) {
    deslocamentoRef.current = valor;
    setDeslocamento(valor);
  }

  function finalizar() {
    if (deslocamentoRef.current <= -LIMITE) {
      setConfirmando(true);
    }
    mover(0);
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card">
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-28 items-center justify-center bg-destructive/20 text-xs font-medium text-destructive">
        Remover
      </div>

      <div
        className={cn("relative bg-card p-4", !arrastando.current && "transition-transform")}
        style={{ transform: `translateX(${deslocamento}px)` }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          inicio.current = e.clientX;
          arrastando.current = true;
        }}
        onPointerMove={(e) => {
          if (inicio.current === null) return;
          const delta = e.clientX - inicio.current;
          mover(Math.min(0, Math.max(-140, delta)));
        }}
        onPointerUp={() => {
          inicio.current = null;
          arrastando.current = false;
          finalizar();
        }}
        onPointerCancel={() => {
          inicio.current = null;
          arrastando.current = false;
          mover(0);
        }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg">{item.trecho}</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Clock className="size-3.5 shrink-0 text-primary" />
                {item.data || "data a combinar"}
                {item.hora ? ` às ${item.hora}` : ""} ·{" "}
                {item.periodo === "noite" ? "18h às 5h" : "Dia"}
              </li>
              <li className="flex items-center gap-2">
                <Car className="size-3.5 shrink-0 text-primary" />
                Carro {item.carro === "pequeno" ? "pequeno (até 4)" : "grande (até 5)"}
                <UserRound className="ml-2 size-3.5 shrink-0 text-primary" />
                {item.passageiros}
              </li>
              {item.embarqueLocal ? (
                <li className="flex items-center gap-2">
                  <MapPin className="size-3.5 shrink-0 text-primary" />
                  <span className="truncate">{item.embarqueLocal}</span>
                </li>
              ) : null}
              {item.observacoes ? <li className="truncate">Obs: {item.observacoes}</li> : null}
            </ul>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <p className="font-display text-xl">
              {item.valor ? formatBRL(item.valor) : "Sob consulta"}
            </p>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              aria-label={`Remover ${item.trecho} do carrinho`}
              onClick={() => setConfirmando(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground md:hidden">
          Dica: deslize o item para a esquerda para remover.
        </p>
      </div>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover "{item.trecho}" do carrinho?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onRemover(item.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
