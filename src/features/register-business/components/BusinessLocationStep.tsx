import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { FormData } from "../schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL } from "@/lib/api-config";

interface Provincia {
  id_provincia: number;
  nombre: string;
}

interface Localidad {
  id_localidad: number;
  nombre: string;
}

type Props = {
  form: UseFormReturn<FormData>;
};

export default function BusinessLocationStep({ form }: Props) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);

  const selectedProvinciaId = watch("id_provincia");
  const selectedLocalidadId = watch("id_localidad");

  // 1. CARGAR PROVINCIAS
  useEffect(() => {
    const fetchProvincias = async () => {
      setLoadingProvincias(true);
      try {
        const response = await fetch(`${API_BASE_URL}/georef/provincias`);
        const data = await response.json();

        const lista = Array.isArray(data) ? data : (data.provincias || []);
        setProvincias(
          lista.sort((a: Provincia, b: Provincia) => a.nombre.localeCompare(b.nombre))
        );
      } catch (e) {
        console.error("Error cargando provincias:", e);
      } finally {
        setLoadingProvincias(false);
      }
    };
    fetchProvincias();
  }, []);

  // 2. CARGAR LOCALIDADES
  useEffect(() => {
    let isMounted = true;

    const fetchLocalidades = async () => {
      if (!selectedProvinciaId) {
        setLocalidades([]);
        return;
      }

      setLoadingLocalidades(true);
      try {
        const url = `${API_BASE_URL}/georef/localidades?id_provincia=${selectedProvinciaId}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          const lista = Array.isArray(data) ? data : (data.localidades || []);

          setLocalidades(
            lista.sort((a: Localidad, b: Localidad) => a.nombre.localeCompare(b.nombre))
          );
          setValue("id_localidad", null);
          setValue("ciudad", "");
        }
      } catch (error) {
        console.error("Error cargando ciudades:", error);
      } finally {
        if (isMounted) setLoadingLocalidades(false);
      }
    };

    fetchLocalidades();
    return () => {
      isMounted = false;
    };
  }, [selectedProvinciaId, setValue]);

  const handleLocalidadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idLocalidad = e.target.value ? Number(e.target.value) : null;
    const localidad = localidades.find((l) => l.id_localidad === idLocalidad);

    setValue("id_localidad", idLocalidad, { shouldValidate: true });
    setValue("ciudad", localidad?.nombre ?? "", { shouldValidate: true });
  };

  return (
    <div className="space-y-4">
      {/* PROVINCIA */}
      <div className="space-y-2">
        <Label htmlFor="id_provincia">Provincia</Label>
        <select
          {...register("id_provincia")}
          id="id_provincia"
          disabled={loadingProvincias}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring disabled:opacity-50 [&>option]:bg-background [&>option]:text-foreground"
        >
          <option value="">{loadingProvincias ? "Cargando..." : "Seleccioná provincia"}</option>
          {provincias.map((p) => (
            <option key={p.id_provincia} value={p.id_provincia}>{p.nombre}</option>
          ))}
        </select>
        {errors.id_provincia && <p className="text-xs text-destructive">{errors.id_provincia.message}</p>}
      </div>

      {/* CIUDAD */}
      <div className="space-y-2">
        <Label htmlFor="id_localidad">Ciudad / Localidad</Label>
        <select
          id="id_localidad"
          value={selectedLocalidadId ?? ""}
          onChange={handleLocalidadChange}
          disabled={!selectedProvinciaId || loadingLocalidades}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50 [&>option]:bg-background [&>option]:text-foreground"
        >
          <option value="">
            {loadingLocalidades ? "Buscando ciudades..." : "Seleccioná ciudad"}
          </option>
          {localidades.map((l) => (
            <option key={l.id_localidad} value={l.id_localidad}>{l.nombre}</option>
          ))}
        </select>
        {errors.ciudad && <p className="text-xs text-destructive">{errors.ciudad.message}</p>}
      </div>

      {/* DIRECCIÓN */}
      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input {...register("direccion")} id="direccion" placeholder="Calle y Nro" />
        {errors.direccion && <p className="text-xs text-destructive">{errors.direccion.message}</p>}
      </div>
    </div>
  );
}