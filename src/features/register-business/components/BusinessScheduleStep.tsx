"use client";

import type { UseFormReturn } from "react-hook-form";
import type { FormData } from "../schema";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Clock, Copy } from "lucide-react";
import { useState } from "react";

// Generar opciones de horas (00-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
// Generar opciones de minutos (00, 15, 30, 45)
const MINUTES = ["00", "15", "30", "45"];

function TimeSelect({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (value: string) => void;
}) {
  const [hours, minutes] = (value || "09:00").split(":");
  
  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${minutes || "00"}`);
  };
  
  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hours || "09"}:${newMinute}`);
  };

  return (
    <div className="flex items-center gap-1">
      <select
        value={hours || "09"}
        onChange={(e) => handleHourChange(e.target.value)}
        className="h-9 w-16 cursor-pointer rounded-md border-0 bg-background text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring [&>option]:bg-background [&>option]:text-foreground"
      >
          {HOURS.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-muted-foreground font-medium">:</span>
        <select
          value={minutes || "00"}
          onChange={(e) => handleMinuteChange(e.target.value)}
          className="h-9 w-16 cursor-pointer rounded-md border-0 bg-background text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring [&>option]:bg-background [&>option]:text-foreground"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
}

type Props = {
  form: UseFormReturn<FormData>;
};

const DAYS = [
  { key: "Lunes", short: "L" },
  { key: "Martes", short: "M" },
  { key: "Miércoles", short: "X" },
  { key: "Jueves", short: "J" },
  { key: "Viernes", short: "V" },
  { key: "Sábado", short: "S" },
  { key: "Domingo", short: "D" },
];

export default function BusinessScheduleStep({ form }: Props) {
  const { watch, setValue } = form;
  const [copyFromDay, setCopyFromDay] = useState<string | null>(null);

  const handleToggleDay = (day: string, currentValue: boolean) => {
    setValue(`horarios.${day}.open`, !currentValue);
    if (!currentValue) {
      // Si se activa, poner horario por defecto
      setValue(`horarios.${day}.start`, "09:00");
      setValue(`horarios.${day}.end`, "18:00");
    }
  };

  const applyToAllDays = (sourceDay: string) => {
    const sourceStart = watch(`horarios.${sourceDay}.start`);
    const sourceEnd = watch(`horarios.${sourceDay}.end`);
    const sourceOpen = watch(`horarios.${sourceDay}.open`);

    DAYS.forEach(({ key }) => {
      if (key !== sourceDay) {
        setValue(`horarios.${key}.open`, sourceOpen);
        setValue(`horarios.${key}.start`, sourceStart);
        setValue(`horarios.${key}.end`, sourceEnd);
      }
    });
    setCopyFromDay(null);
  };

  const applyToWeekdays = (sourceDay: string) => {
    const sourceStart = watch(`horarios.${sourceDay}.start`);
    const sourceEnd = watch(`horarios.${sourceDay}.end`);
    const sourceOpen = watch(`horarios.${sourceDay}.open`);

    const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
    weekdays.forEach((key) => {
      setValue(`horarios.${key}.open`, sourceOpen);
      setValue(`horarios.${key}.start`, sourceStart);
      setValue(`horarios.${key}.end`, sourceEnd);
    });
    setCopyFromDay(null);
  };

  return (
    <div className="space-y-3">
      {/* Header con leyenda */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Configura tus horarios de atención</span>
        </div>
      </div>

      {/* Lista de días */}
      <div className="space-y-2">
        {DAYS.map(({ key: day, short }) => {
          const open = watch(`horarios.${day}.open`);

          return (
            <div
              key={day}
              className={`
                relative flex items-center justify-between 
                rounded-lg border px-4 py-3 transition-all duration-200
                ${open 
                  ? "border-primary/20 bg-primary/5 dark:border-primary/40 dark:bg-primary/10" 
                  : "border-border bg-muted/30"
                }
              `}
            >
              {/* Izquierda: Toggle + Nombre del día */}
              <div className="flex items-center gap-3">
                <Switch
                  checked={open}
                  onCheckedChange={() => handleToggleDay(day, open)}
                  className="data-[state=checked]:bg-primary"
                />
                
                <div className="flex items-center gap-2">
                  <span 
                    className={`
                      flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold
                      ${open 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                      }
                    `}
                  >
                    {short}
                  </span>
                  <span className={`font-medium ${open ? "text-foreground" : "text-muted-foreground"}`}>
                    {day}
                  </span>
                </div>
              </div>

              {/* Derecha: Horarios o Cerrado */}
              {open ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-3 rounded-md bg-background border border-border px-3 py-1.5">
                    <TimeSelect
                      value={watch(`horarios.${day}.start`)}
                      onChange={(val) => setValue(`horarios.${day}.start`, val)}
                    />
                    <span className="text-muted-foreground">-</span>
                    <TimeSelect
                      value={watch(`horarios.${day}.end`)}
                      onChange={(val) => setValue(`horarios.${day}.end`, val)}
                    />
                  </div>
                  
                  {/* Botón copiar */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => setCopyFromDay(copyFromDay === day ? null : day)}
                    title="Copiar horario"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <span className="rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground">
                  Cerrado
                </span>
              )}

              {/* Menú de copiar */}
              {copyFromDay === day && (
                <div className="absolute right-0 top-full mt-1 z-10 rounded-lg border bg-popover p-2 shadow-lg">
                  <p className="text-xs text-muted-foreground mb-2 px-2">Aplicar este horario a:</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={() => applyToWeekdays(day)}
                  >
                    Lunes a Viernes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={() => applyToAllDays(day)}
                  >
                    Todos los días
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        Usa el icono <Copy className="inline h-3 w-3" /> para copiar el horario a otros días
      </p>
    </div>
  );
}
