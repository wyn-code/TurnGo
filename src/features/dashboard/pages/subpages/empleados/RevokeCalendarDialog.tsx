import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import type { ApiEmpleado } from "@/types/api";

interface RevokeCalendarDialogProps {
  empleado: ApiEmpleado | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function RevokeCalendarDialog({
  empleado,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: RevokeCalendarDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Revocar acceso al calendario?</AlertDialogTitle>

          <AlertDialogDescription>
            El link de Google Calendar de{" "}
            {empleado ? (
              <span className="font-semibold text-foreground">
                &quot;{empleado.nombre} {empleado.apellido}&quot;
              </span>
            ) : (
              "este profesional"
            )}{" "}
            dejará de funcionar de inmediato: los turnos dejarán de
            sincronizarse en su calendario. Podés generar un link nuevo cuando
            quieras.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>

          <Button
            type="button"
            variant="destructive"
            disabled={isLoading || !empleado}
            onClick={() => void onConfirm()}
          >
            {isLoading ? "Revocando..." : "Revocar acceso"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
