import { useState, type ReactNode } from "react";

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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Confirmação de ação destrutiva/importante — substitui window.confirm em
 * todo o app (achado revisando UX: window.confirm é um popup nativo do SO,
 * quebra o tema escuro do resto do app). Usado no admin (excluir rota,
 * veículo, foto, motorista, agendamento, bloco de conteúdo) e no painel do
 * motorista (mudança de status que pula uma etapa). */
export function ConfirmarAcao({
  trigger,
  titulo,
  descricao,
  textoConfirmar = "Confirmar",
  destrutivo = true,
  onConfirmar,
}: {
  trigger: (abrir: () => void) => ReactNode;
  titulo: string;
  descricao: string;
  textoConfirmar?: string;
  destrutivo?: boolean;
  onConfirmar: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger(() => setOpen(true))}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={cn("h-11", destrutivo && buttonVariants({ variant: "destructive" }))}
            onClick={onConfirmar}
          >
            {textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
