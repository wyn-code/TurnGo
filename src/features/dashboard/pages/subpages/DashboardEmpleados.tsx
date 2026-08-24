import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  PowerOff,
  Power,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import type { ApiEmpleado } from "@/types/api";
import { EmployeeForm, type EmployeeFormValues } from "./services/EmployeeForm";
import {
  CalendarDialog,
  type CalendarFormValues,
} from "./empleados/CalendarDialog";
import { RevokeCalendarDialog } from "./empleados/RevokeCalendarDialog";
import { EmpleadoCalendarioBadge } from "./empleados/EmpleadoCalendarioBadge";
import { useDashboardBusiness } from "@/features/dashboard/contexts/DashboardBusinessContext";
import { useEmployees } from "@/hooks/queries/useEmployeesQuery";
import { useCreateEmployee } from "@/hooks/mutations/useCreateEmployee";
import { useToggleEmployee } from "@/hooks/mutations/useToggleEmployee";
import { useUpdateEmployee } from "@/hooks/mutations/useUpdateEmployee";
import { useGenerarCalendario } from "@/hooks/mutations/useGenerarCalendario";
import { useRevocarCalendario } from "@/hooks/mutations/useRevocarCalendario";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const DashboardEmpleados = () => {
  const { business, isLoadingBusiness } = useDashboardBusiness();
  const businessId = business?.id_negocio ? String(business.id_negocio) : null;
  const [showInactive, setShowInactive] = useState(false);

  const {
    data: employees = [],
    isLoading,
    error,
  } = useEmployees(businessId);

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const toggleMutation = useToggleEmployee();
  const generarCalendarioMutation = useGenerarCalendario();
  const revocarCalendarioMutation = useRevocarCalendario();

  const [selectedEmployee, setSelectedEmployee] = useState<ApiEmpleado | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [calendarEmployee, setCalendarEmployee] = useState<ApiEmpleado | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiEmpleado | null>(null);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);

  const filteredEmployees = showInactive
    ? employees
    : employees.filter((e) => e.activo);

  const handleSubmit = async (values: EmployeeFormValues) => {
    if (!businessId) return;

    try {
      if (selectedEmployee) {
        await updateMutation.mutateAsync({
          id: selectedEmployee.id_empleado,
          data: {
            nombre: values.nombre,
            apellido: values.apellido,
            telefono: values.telefono,
            activo: values.activo,
          },
        });
        toast.success("Profesional actualizado");
      } else {
        await createMutation.mutateAsync({
          id_negocio: Number(businessId),
          nombre: values.nombre,
          apellido: values.apellido,
          telefono: values.telefono,
          activo: values.activo,
        });
        toast.success("Profesional creado");
      }

      setIsFormOpen(false);
      setSelectedEmployee(null);
    } catch {
      // Los hooks ya muestran el error
    }
  };

  const handleToggle = async (employee: ApiEmpleado) => {
    try {
      await toggleMutation.mutateAsync({ id: employee.id_empleado, activo: !employee.activo });
      toast.success(
        employee.activo ? "Profesional desactivado" : "Profesional reactivado",
      );
    } catch {
      // El hook ya muestra el error
    }
  };

  const handleEnviarLink = async (values: CalendarFormValues) => {
    if (!businessId || !calendarEmployee) return;

    try {
      await generarCalendarioMutation.mutateAsync({
        businessId,
        empleadoId: calendarEmployee.id_empleado,
        email: values.email,
      });
      toast.success(`Link de calendario enviado a ${values.email}`);
      setIsCalendarOpen(false);
    } catch {
      // El hook ya muestra el error
    }
  };

  const handleRevocar = async () => {
    if (!businessId || !revokeTarget) return;

    try {
      await revocarCalendarioMutation.mutateAsync({
        businessId,
        empleadoId: revokeTarget.id_empleado,
      });
      setIsRevokeOpen(false);
      setRevokeTarget(null);
    } catch {
      // El hook ya muestra el error
    }
  };

  if (isLoading || isLoadingBusiness) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Cargando..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive p-8 text-center">
        <p className="text-destructive">
          Error cargando profesionales: {error.message}
        </p>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No encontramos un negocio vinculado a tu usuario.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Profesionales</h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive-employees"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label
                htmlFor="show-inactive-employees"
                className="cursor-pointer text-sm text-muted-foreground"
              >
                Ver inactivos
              </Label>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setSelectedEmployee(null);
                setIsFormOpen(true);
              }}
              disabled={createMutation.isPending}
            >
              <Plus size={14} className="mr-1" />
              Nuevo profesional
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {filteredEmployees.map((employee) => (
            <Card
              key={employee.id_empleado}
              className={!employee.activo ? "border-dashed opacity-90" : undefined}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-foreground">
                    {employee.nombre} {employee.apellido}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {employee.telefono}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Badge
                    variant={employee.activo ? "secondary" : "outline"}
                    className={
                      employee.activo
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }
                  >
                    {employee.activo ? "Activo" : "Inactivo"}
                  </Badge>

                  <EmpleadoCalendarioBadge
                    businessId={businessId}
                    employee={employee}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setCalendarEmployee(employee);
                      setIsCalendarOpen(true);
                    }}
                    title="Google Calendar"
                    aria-label={`Calendario de ${employee.nombre} ${employee.apellido}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Calendar size={14} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setIsFormOpen(true);
                    }}
                    disabled={updateMutation.isPending}
                    title="Editar"
                    aria-label={`Editar ${employee.nombre} ${employee.apellido}`}
                  >
                    <Edit size={14} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggle(employee)}
                    disabled={toggleMutation.isPending}
                    title={employee.activo ? "Desactivar" : "Reactivar"}
                    aria-label={employee.activo ? "Desactivar profesional" : "Reactivar profesional"}
                    className={
                      employee.activo
                        ? "text-muted-foreground hover:text-destructive"
                        : "text-primary hover:text-primary"
                    }
                  >
                    {employee.activo ? (
                      <PowerOff size={14} />
                    ) : (
                      <Power size={14} />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              {showInactive
                ? "No hay profesionales inactivos."
                : "No hay profesionales activos. Agregá uno para empezar."}
            </p>
          </div>
        )}
      </div>

      <EmployeeForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        employee={selectedEmployee}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <CalendarDialog
        open={isCalendarOpen}
        onOpenChange={(open) => {
          setIsCalendarOpen(open);
          if (!open) setCalendarEmployee(null);
        }}
        businessId={businessId}
        empleado={calendarEmployee}
        isLoading={generarCalendarioMutation.isPending}
        onSubmit={handleEnviarLink}
        onRequestRevoke={() => {
          setRevokeTarget(calendarEmployee);
          setIsCalendarOpen(false);
          setIsRevokeOpen(true);
        }}
      />

      <RevokeCalendarDialog
        open={isRevokeOpen}
        onOpenChange={(open) => {
          setIsRevokeOpen(open);
          if (!open) setRevokeTarget(null);
        }}
        empleado={revokeTarget}
        isLoading={revocarCalendarioMutation.isPending}
        onConfirm={handleRevocar}
      />
    </>
  );
};

export default DashboardEmpleados;