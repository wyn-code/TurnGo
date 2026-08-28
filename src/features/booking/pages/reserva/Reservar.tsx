import { useState, useMemo, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  Loader2,
} from "lucide-react";

import { useBusinessBySlug } from "@/hooks/useApi";
import { useServices } from "@/hooks/queries/useServicesQuery";
import { useEmployees } from "@/hooks/queries/useEmployeesQuery";
import { useHorarios } from "@/hooks/queries/useHorariosQuery";

import { cn } from "@/lib/utils";

import BookingStepper from "@/features/booking/components/BookingStepper";
import BookingForm from "@/features/booking/components/BookingForm";
import BookingSummary from "@/features/booking/components/BookingSummary";
import ServiceCard from "@/features/business/components/ServiceCard";
import ProfessionalCard from "@/features/business/components/ProfessionalCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type {
  BookingData,
  ApiTurnoDisponibilidad,
  ApiHorario,
} from "@/types/api";
import { ApiError } from "@/lib/api-client";
import { buildLocalDateTimeString } from "@/lib/datetime-utils";
import { apiDayToWeekDayIndex, WEEK_DAYS } from "@/lib/schedule-utils";
import { useAppointmentAvailability } from "@/features/booking/hooks/useAppointmentAvailability";
import {
  useCreateAppointment,
  useUpsertClient,
} from "@/features/booking/hooks/useBookingMutations";

const STEPS = ["Servicio", "Fecha y horario", "Datos", "Completado"];

type TimeSlot = { id: string; time: string; available: boolean };

const EMPTY_AVAILABILITY: ApiTurnoDisponibilidad[] = [];

const pad = (v: number) => String(v).padStart(2, "0");
const toLocalDateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
const rangesOverlap = (aS: Date, aE: Date, bS: Date, bE: Date) =>
  aS < bE && aE > bS;

const SLOT_INTERVAL = 30;

const generateTimeSlots = (
  selectedDate: Date | null,
  occupied: ApiTurnoDisponibilidad[],
  duration: number,
  ranges?: { start: string; end: string }[],
): TimeSlot[] => {
  if (!selectedDate || !ranges || ranges.length === 0) return [];
  const slots: TimeSlot[] = [];
  const now = new Date();

  for (const range of ranges) {
    const [sh, sm] = range.start.split(":").map(Number);
    const [eh, em] = range.end.split(":").map(Number);

    const dayStart = new Date(selectedDate);
    dayStart.setHours(sh, sm, 0, 0);

    const cruzaMedianoche = eh < sh || (eh === sh && em < sm);
    const dayEnd = new Date(
      cruzaMedianoche
        ? selectedDate.getTime() + 86400000
        : selectedDate.getTime(),
    );
    dayEnd.setHours(eh, em, 0, 0);
    if (!cruzaMedianoche && dayEnd <= dayStart) continue;

    let cur = new Date(dayStart);
    while (true) {
      const end = addMinutes(cur, duration);
      if (end > dayEnd) break;

      const time = `${pad(cur.getHours())}:${pad(cur.getMinutes())}`;
      const isPast = cur <= now;

      const slotStartStr = buildLocalDateTimeString(selectedDate, time);
      const slotEndTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
      const slotEndStr = buildLocalDateTimeString(selectedDate, slotEndTime);

      const isOccupied = occupied.some((t) => {
        if (!t.fecha_hora_inicio || !t.fecha_hora_fin) return false;
        const dbStart = new Date(t.fecha_hora_inicio);
        const dbEnd = new Date(t.fecha_hora_fin);
        const slotStartObj = new Date(slotStartStr);
        const slotEndObj = new Date(slotEndStr);
        return rangesOverlap(slotStartObj, slotEndObj, dbStart, dbEnd);
      });

      slots.push({ id: time, time, available: !isPast && !isOccupied });
      cur = addMinutes(cur, SLOT_INTERVAL);
    }
  }

  return slots;
};


const Reservar = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preSelectedService = searchParams.get("servicio") || "";

  const businessQuery = useBusinessBySlug(slug ?? "");
  const businessId = businessQuery.data?.id_negocio ?? null;
  const servicesQuery = useServices(businessId);
  const employeesQuery = useEmployees(businessId);
  const schedulesQuery = useHorarios(businessId);
  const services = servicesQuery.data ?? [];
  const professionals = employeesQuery.data ?? [];
  const business = useMemo(
    () =>
      businessQuery.data
        ? { ...businessQuery.data, horarios: schedulesQuery.data ?? [] }
        : null,
    [businessQuery.data, schedulesQuery.data],
  );
  const isLoading =
    businessQuery.isLoading ||
    (businessId != null &&
      (servicesQuery.isLoading ||
        employeesQuery.isLoading ||
        schedulesQuery.isLoading));
  const error =
    !slug || businessQuery.error || servicesQuery.error || employeesQuery.error
      ? "No se pudo cargar el negocio para reservar"
      : null;

  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState<BookingData>({
    serviceId: preSelectedService,
    professionalId: "",
    date: null,
    timeSlot: "",
    client: { firstName: "", lastName: "", phone: "", email: "", notes: "" },
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const [createdTurnoId, setCreatedTurnoId] = useState<number | null>(null);

  const getBusinessHoursForDate = useCallback(
  (b: typeof business, date: Date | null) => {
    if (!b || !date || !b.horarios) return undefined;

    const jsDay = date.getDay();
    const apiDay = jsDay === 0 ? 6 : jsDay - 1;

    const matching = b.horarios
      .filter((x: ApiHorario) => {
        const dayIndex = apiDayToWeekDayIndex(x.dia_semana);
        return dayIndex === apiDay;
      })
      .sort((a: ApiHorario, b: ApiHorario) =>
        a.hora_apertura.localeCompare(b.hora_apertura),
      );

    if (matching.length === 0) return undefined;

    return matching.map((h: ApiHorario) => ({
      start: h.hora_apertura,
      end: h.hora_cierre,
    }));
  },
  []
);

  const selectedService = services.find(
    (s) => String(s.id_servicio) === String(booking.serviceId),
  );
  const selectedProfessional = professionals.find(
    (p) => String(p.id_empleado) === String(booking.professionalId),
  );
  const serviceDuration = selectedService?.duracion_min ?? 30;
  const businessHours = getBusinessHoursForDate(business, booking.date);

  const dayAvailabilityParams = useMemo(() => {
    if (businessId == null || booking.date == null) return null;

    return {
      businessId,
      desde: buildLocalDateTimeString(booking.date, "00:00"),
      hasta: buildLocalDateTimeString(booking.date, "23:59"),
      employeeId: booking.professionalId || null,
    };
  }, [businessId, booking.date, booking.professionalId]);
  const monthAvailabilityParams = useMemo(() => {
    if (businessId == null) return null;

    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
    return {
      businessId,
      desde: buildLocalDateTimeString(monthStart, "00:00"),
      hasta: buildLocalDateTimeString(monthEnd, "23:59"),
      employeeId: booking.professionalId || null,
    };
  }, [businessId, visibleMonth, booking.professionalId]);
  const dayAvailabilityQuery = useAppointmentAvailability(dayAvailabilityParams);
  const monthAvailabilityQuery = useAppointmentAvailability(monthAvailabilityParams);
  const upsertClient = useUpsertClient();
  const createAppointment = useCreateAppointment();
  const isSubmitting = upsertClient.isPending || createAppointment.isPending;
  const occupiedAppointments = dayAvailabilityQuery.data ?? EMPTY_AVAILABILITY;
  const isLoadingSlots = dayAvailabilityQuery.isLoading;

  const occupiedDays = useMemo(() => {
    if (!business || monthAvailabilityParams == null) return new Set<string>();

    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
    const byDay = new Map<string, ApiTurnoDisponibilidad[]>();
    for (const appointment of monthAvailabilityQuery.data ?? []) {
      const key = toLocalDateKey(new Date(appointment.fecha_hora_inicio));
      byDay.set(key, [...(byDay.get(key) ?? []), appointment]);
    }

    const blocked = new Set<string>();
    for (let dayOffset = 0; ; dayOffset++) {
      const day = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() + dayOffset);
      if (day > monthEnd) break;
      const key = toLocalDateKey(day);
      const slots = generateTimeSlots(
        day,
        byDay.get(key) ?? [],
        serviceDuration,
        getBusinessHoursForDate(business, day),
      );
      if (!slots.some((slot) => slot.available)) blocked.add(key);
    }
    return blocked;
  }, [business, monthAvailabilityParams, monthAvailabilityQuery.data, visibleMonth, serviceDuration, getBusinessHoursForDate]);

  const timeSlots = useMemo(
    () => generateTimeSlots(booking.date, occupiedAppointments, serviceDuration, businessHours),
    [booking.date, occupiedAppointments, serviceDuration, businessHours],
  );
  const availableSlots = timeSlots.filter((s) => s.available);
  const effectiveSelectedTime = booking.timeSlot;
  

  const canNext = (): boolean => {
    switch (step) {
      case 1: return !!booking.serviceId && !!booking.professionalId;
      case 2: return !!booking.date && timeSlots.some((s) => s.time === effectiveSelectedTime && s.available);
      case 3: return !!(booking.client.firstName && booking.client.lastName && booking.client.phone && booking.client.email);
      default: return false;
    }
  };

  const handleConfirm = async () => {
    try {
      setSubmitError(null);
      if (!business || !booking.date || !effectiveSelectedTime || !booking.serviceId) {
        setSubmitError("Faltan datos para confirmar la reserva"); return;
      }
      if (!booking.client.firstName.trim() || !booking.client.lastName.trim() || !booking.client.phone.trim()) {
        setSubmitError("Faltan datos del cliente"); return;
      }
      const cliente = await upsertClient.mutateAsync({
        telefono: booking.client.phone.trim(),
        nombre: booking.client.firstName.trim(),
        apellido: booking.client.lastName.trim(),
        email: booking.client.email.trim() || undefined,
      });
      const turno = await createAppointment.mutateAsync({
        id_negocio: Number(business.id_negocio),
        id_cliente: Number(cliente.id_cliente),
        id_servicio: Number(booking.serviceId),
        id_empleado: booking.professionalId ? Number(booking.professionalId) : null,
        fecha_hora_inicio: buildLocalDateTimeString(booking.date, effectiveSelectedTime),
      });
      setCreatedTurnoId(turno.id_turno);
      setStep(4);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setSubmitError("...");
          setBooking((c) => ({ ...c, timeSlot: "" }));
          await Promise.all([
            dayAvailabilityQuery.refetch(),
            monthAvailabilityQuery.refetch(),
          ]);
          setStep(2);
          return;
        }
        setSubmitError(err.detail || err.message); return;
      }
      if (err instanceof Error) { setSubmitError(err.message); return; }
      setSubmitError("Error inesperado al crear la reserva");
    }
  };

  // -------- Loading --------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-background to-background">
        <div className="max-w-3xl mx-auto px-4 py-24 flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-muted-foreground">Cargando reserva...</p>
        </div>
      </div>
    );
  }

  // -------- Error --------
  if (error || !business) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-background to-background">
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Negocio no encontrado</h1>
          <p className="text-muted-foreground mb-6">{error ?? "Revisá el enlace e intentá de nuevo."}</p>
          <Button asChild><Link to="/">Ver todos los negocios</Link></Button>
        </div>
      </div>
    );
  }

  // -------- Success --------
  if (step === 4 && selectedService && selectedProfessional && booking.date) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50/40 via-background to-background">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-card border rounded-3xl p-8 md:p-12 shadow-sm text-center">
            <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center animate-in zoom-in duration-500">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-semibold mb-2">¡Tu turno está confirmado!</h1>
            <p className="text-muted-foreground mb-8">Te esperamos. Recibirás un recordatorio por email.</p>
            <BookingSummary
              businessName={business.nombre}
              service={selectedService}
              professional={selectedProfessional}
              date={booking.date}
              time={effectiveSelectedTime}
              client={booking.client}
              turnoId={createdTurnoId}
            />
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="outline"><Link to={`/negocio/${slug}`}>Volver al negocio</Link></Button>
              <Button asChild><Link to="/">Ir al inicio</Link></Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-background to-background">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <Link
        to={`/${slug}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
        <ArrowLeft className="h-4 w-4" />
        {business.nombre}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/70 text-amber-900 text-xs font-medium mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Reservá en menos de un minuto
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Reservar turno</h1>
          <p className="text-muted-foreground mt-2">
            {STEPS[step - 1]} · Paso {step} de {STEPS.length - 1}
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <BookingStepper steps={STEPS.slice(0, -1)} currentStep={step} />
        </div>

        {/* Error banner */}
        {submitError && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{submitError}</p>
          </div>
        )}

        <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
          {/* STEP 1 — Servicio + Profesional */}
          {step === 1 && (
            <div className="space-y-10 animate-in fade-in duration-300">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">1</span>
                  <h2 className="text-xl font-semibold">Elegí un servicio</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id_servicio}
                      service={service}
                      selected={String(service.id_servicio) === String(booking.serviceId)}
                      onSelect={() => {
                        setSubmitError(null);
                        setBooking((c) => ({
                          ...c,
                          serviceId: String(service.id_servicio),
                          timeSlot: "",
                        }));
                      }}
                      showBookButton={false}
                    />
                  ))}
                </div>
              </section>

              {booking.serviceId && (
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">2</span>
                    <h2 className="text-xl font-semibold">Elegí un profesional</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {professionals.map((professional) => (
                      <ProfessionalCard
                        key={professional.id_empleado}
                        professional={professional}
                        selected={String(professional.id_empleado) === String(booking.professionalId)}
                        onSelect={() => {
                          setSubmitError(null);
                          setBooking((c) => ({
                            ...c,
                            professionalId: String(professional.id_empleado),
                            timeSlot: "",
                          }));
                          setStep(2);
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* STEP 2 — Fecha y horario */}
          {step === 2 && (
            <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
              {/* Calendario */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Elegí una fecha</h2>
                </div>
                <div className="rounded-2xl border bg-background p-2">
                  <Calendar
                    mode="single"
                    selected={booking.date ?? undefined}
                    month={visibleMonth}
                    onMonthChange={setVisibleMonth}
                    onSelect={(date) => {
                      setSubmitError(null);
                      setBooking((c) => ({ ...c, date: date ?? null, timeSlot: "" }));
                    }}
                    disabled={(date) => {
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      return date < today || occupiedDays.has(toLocalDateKey(date));
                    }}
                    modifiers={{ fullyBooked: (d) => occupiedDays.has(toLocalDateKey(d)) }}
                    modifiersClassNames={{
                      fullyBooked:
                        "relative !opacity-100 bg-destructive/10 text-destructive/70 line-through",
                    }}
                    showOutsideDays
                    locale={es}
                    className="pointer-events-auto"
                  />
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Seleccionado
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" /> Sin cupos
                  </span>
                </div>

                {business.horarios && business.horarios.length > 0 && (
                  <div className="mt-4 rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Horarios del negocio</p>
                    <div className="space-y-1">
                      {WEEK_DAYS.map((dayName, idx) => {
                        const horario = business.horarios!.find(
                          (h) => apiDayToWeekDayIndex(h.dia_semana) === idx,
                        );
                        const isSelected = booking.date && (booking.date.getDay() === 0 ? 7 : booking.date.getDay()) === idx + 1;
                        return (
                          <div
                            key={dayName}
                            className={`flex justify-between text-xs ${isSelected ? "font-semibold text-primary" : horario ? "text-foreground" : "text-muted-foreground/50"}`}
                          >
                            <span>{dayName}</span>
                            <span>
                              {horario
                                ? `${horario.hora_apertura.slice(0, 5)} – ${horario.hora_cierre.slice(0, 5)}`
                                : "Cerrado"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Horarios */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Elegí un horario</h2>
                  </div>
                  {booking.date && (
                    <span className="text-sm text-muted-foreground capitalize">
                      {format(booking.date, "EEE d 'de' MMM", { locale: es })}
                    </span>
                  )}
                </div>

                {!booking.date ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Seleccioná primero una fecha en el calendario.
                  </div>
                ) : isLoadingSlots ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="h-10 rounded-full bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : (
                  (() => {
                    const morning = timeSlots.filter((s) => Number(s.time.split(":")[0]) < 12);
                    const afternoon = timeSlots.filter((s) => Number(s.time.split(":")[0]) >= 12);

                    const renderGroup = (label: string, icon: React.ReactNode, slots: TimeSlot[]) => {
                      if (!slots.length) return null;
                      return (
                        <div className="mb-5">
                          <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                            {icon}
                            {label}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {slots.map((slot) => (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={!slot.available}
                                onClick={() => {
                                  setSubmitError(null);
                                  setBooking((c) => ({ ...c, timeSlot: slot.time }));
                                }}
                                className={cn(
                                  "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                                  effectiveSelectedTime === slot.time
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                                    : slot.available
                                      ? "bg-background hover:bg-amber-50 hover:border-amber-300 border-border"
                                      : "bg-muted/50 text-muted-foreground/50 line-through cursor-not-allowed border-transparent",
                                )}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {renderGroup("Mañana", <Sun className="h-4 w-4" />, morning)}
                        {renderGroup("Tarde", <Moon className="h-4 w-4" />, afternoon)}
                        {availableSlots.length === 0 && (
                          <div className="rounded-2xl border border-dashed p-8 text-center">
                            <p className="font-medium">No hay horarios disponibles</p>
                            <p className="text-sm text-muted-foreground mt-1">Probá seleccionando otra fecha.</p>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — Datos */}
          {step === 3 && (
            <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Tus datos</h2>
                </div>
                <BookingForm
                  data={ booking.client }
                  onChange={(client) => setBooking((c) => ({ ...c, client }))}
                />
              </div>
              {selectedService && selectedProfessional && booking.date && (
                <aside className="lg:sticky lg:top-6 self-start">
                  <BookingSummary
                    businessName={business.nombre}
                    service={selectedService}
                    professional={selectedProfessional}
                    date={booking.date}
                    time={effectiveSelectedTime}
                    client={booking.client}
                  />
                </aside>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between mt-6">
          {step > 1 && step < 4 ? (
            <Button variant="ghost" onClick={() => setStep((c) => c - 1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
            </Button>
          ) : <span />}

          {step === 2 && (
            <Button disabled={!canNext()} onClick={() => setStep(3)}>
              Continuar
            </Button>
          )}
          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Una vez confirmada la reserva recibirás un correo electrónico con un código QR y todos los datos de tu turno.
              </p>
              <Button disabled={!canNext() || isSubmitting} onClick={handleConfirm}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" aria-label="Cargando..." />
                    Confirmando...
                  </>
                ) : (
                  "Confirmar reserva"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reservar;
