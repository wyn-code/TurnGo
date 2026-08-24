import { z } from "zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import type { ApiEmpleado } from "@/types/api";
import { useEmployeeCalendarState } from "@/hooks/queries/useEmployeeCalendarState";

const calendarSchema = z.object({
  email: z
    .string()
    .min(1, "Ingresá un email")
    .email("Email inválido"),
});

export type CalendarFormValues = z.infer<typeof calendarSchema>;

interface CalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string | null;
  empleado: ApiEmpleado | null;
  isLoading?: boolean;
  onSubmit: (values: CalendarFormValues) => Promise<void>;
  onRequestRevoke: () => void;
}

export function CalendarDialog({
  open,
  onOpenChange,
  businessId,
  empleado,
  isLoading,
  onSubmit,
  onRequestRevoke,
}: CalendarDialogProps) {
  const { data: estado } = useEmployeeCalendarState(
    open && empleado ? businessId : null,
    empleado?.id_empleado ?? null,
  );

  const form = useForm<CalendarFormValues>({
    resolver: zodResolver(calendarSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({ email: "" });
  }, [open, empleado, form]);

  const handleInvalid = () => {
    const firstError = Object.values(form.formState.errors)[0];
    toast.error(
      firstError?.message?.toString() ??
        "Revisá los campos del formulario",
    );
  };

  const estadoActual = estado?.estado ?? "sin_calendario";
  const yaFueEnviado = Boolean(estado?.calendario_enviado_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Google Calendar de{" "}
            {empleado ? `${empleado.nombre} ${empleado.apellido}` : ""}
          </DialogTitle>

          <DialogDescription>
            Enviaremos por email un link para suscribir el calendario de
            turnos del profesional en Google Calendar. Se actualiza solo con
            cada turno nuevo o cancelado.
          </DialogDescription>
        </DialogHeader>

        {estadoActual === "activo" && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600">
            Este profesional ya tiene un calendario activo. Si enviás el link
            de nuevo, se reutiliza el mismo.
          </p>
        )}

        {estadoActual === "revocado" && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Su link anterior fue revocado y ya no funciona. Al enviar se
            generará uno nuevo.
          </p>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, handleInvalid)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email del profesional</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="juan.perez@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? "Enviando..."
                : yaFueEnviado && estadoActual !== "revocado"
                  ? "Reenviar link"
                  : "Enviar link por email"}
            </Button>

            {estadoActual === "activo" && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                disabled={isLoading}
                onClick={onRequestRevoke}
              >
                Revocar acceso al calendario
              </Button>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
