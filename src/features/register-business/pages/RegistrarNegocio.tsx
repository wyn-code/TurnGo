import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import type { BusinessSchedulePayload } from "@/services/horario.service";
import { toCreateCompleteBusinessRequest } from "../mapper";
import { schema, type FormData } from "../schema";
import { defaultValues, fieldsPerStep, STEPS } from "../defaults";

import SuccessView from "../components/SuccessView";
import BusinessInfoStep from "../components/BusinessInfoStep";
import BusinessImageStep from "../components/BusinessImageStep";
import BusinessContactStep from "../components/BusinessContactStep";
import BusinessLocationStep from "../components/BusinessLocationStep";
import BusinessServicesStep from "../components/BusinessServicesStep";
import BusinessEmployeesStep from "../components/BusinessEmployeesStep";
import BusinessScheduleStep from "../components/BusinessScheduleStep";

import BookingStepper from "@/features/booking/components/BookingStepper";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useCreateBusiness } from "@/hooks/useApi";
import { useUpdateHorarios } from "@/hooks/mutations/useUpdateHorarios";

export default function RegistrarNegocioPage() {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const createBusiness = useCreateBusiness();
  const updateHorarios = useUpdateHorarios({ showErrorToast: false });
  const isLoading = createBusiness.isPending || updateHorarios.isPending;

  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues,
    mode: "onTouched",
  });

  const { trigger, getValues } = form;

  const next = async () => {
    const valid = await trigger(fieldsPerStep[step - 1] as (keyof FormData)[]);
    if (valid) {
      setStep((current) => Math.min(current + 1, STEPS.length));
    }
  };

  const prev = () => {
    setStep((current) => Math.max(current - 1, 1));
  };

  const dayMap: Record<keyof FormData["horarios"], number> = {
    Lunes: 0,
    Martes: 1,
    Miércoles: 2,
    Jueves: 3,
    Viernes: 4,
    Sábado: 5,
    Domingo: 6,
  };

  const formatScheduleForBackend = (
    horarios: FormData["horarios"]
  ): BusinessSchedulePayload[] => {
    return (Object.entries(horarios) as Array<
      [keyof FormData["horarios"], FormData["horarios"][keyof FormData["horarios"]]]
    >)
      .filter(([,value]) => value.open && value.start && value.end)
      .map(([day, value]) => ({
        dia_semana: dayMap[day],
        hora_apertura: `${value.start}:00`,
        hora_cierre: `${value.end}:00`,
      }));
  };

  const getBusinessIdFromResponse = (response: unknown): number | null => {
    if (!response || typeof response !== "object") {
      return null;
    }

    const candidate = response as {
      id_negocio?: number;
      negocio?: { id_negocio?: number };
    };

    if (typeof candidate.id_negocio === "number") {
      return candidate.id_negocio;
    }

    if (typeof candidate.negocio?.id_negocio === "number") {
      return candidate.negocio.id_negocio;
    }

    return null;
  };

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const userId = Number(user?.id);

      if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error("No se pudo identificar al usuario autenticado.");
      }

      const payload = toCreateCompleteBusinessRequest(data, userId);
      const horarios = formatScheduleForBackend(data.horarios);

      const negocioCreado = await createBusiness.mutateAsync(payload);
      const idNegocio = getBusinessIdFromResponse(negocioCreado);

      if (!idNegocio) {
        throw new Error("No se pudo obtener el id del negocio creado.");
      }

      if (horarios.length > 0) {
        await updateHorarios.mutateAsync({
          businessId: idNegocio,
          horarios,
          hasExisting: false,
        });
      }

      await refreshUser();

      setSubmitted(true);
    } catch (err) {
      console.error("Error al crear negocio:", err);
      toast.error("Hubo un problema al registrar el negocio.");
    }
  });

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Prevent accidental submit before the last step (e.g. pressing Enter).
    if (step < STEPS.length) {
      event.preventDefault();
      void next();
      return;
    }

    void onSubmit(event);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <BusinessInfoStep form={form} />;
      case 2:
        return <BusinessImageStep form={form} />;
      case 3:
        return <BusinessContactStep form={form} />;
      case 4:
        return <BusinessLocationStep form={form} />;
      case 5:
        return <BusinessServicesStep form={form} />;
      case 6:
        return <BusinessEmployeesStep form={form} />;
      case 7:
        return <BusinessScheduleStep  form={form} />;
      default:
        return null;
    }
  };

  if (submitted) {
    return <SuccessView data={getValues()} navigate={navigate} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Registrar tu negocio
        </h1>
        <p className="text-muted-foreground mb-6">
          Completá los datos y creá tu página en minutos.
        </p>

        <BookingStepper currentStep={step} steps={STEPS} />

        <Card className="mt-8">
          <form onSubmit={handleFormSubmit}>
          <CardContent className="p-6 space-y-5">
            <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300">
              {renderStep()}
            </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={prev}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>

            {step < STEPS.length ? (
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  next();
                }}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? "Registrando..." : "Registrar negocio"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
          </CardContent>
          </form>
        </Card>
      </main>
    </div>
  );
}
