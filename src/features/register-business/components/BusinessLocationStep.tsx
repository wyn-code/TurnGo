import type { UseFormReturn } from "react-hook-form";
import type { FormData } from "../schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalidades, useProvincias } from "@/hooks/queries/useGeorefQuery";

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

  const selectedProvinciaId = watch("id_provincia");
  const selectedLocalidadId = watch("id_localidad");
  const provinciaId = selectedProvinciaId == null
    ? null
    : Number(selectedProvinciaId);
  const provinciasQuery = useProvincias();
  const localidadesQuery = useLocalidades(provinciaId);
  const provincias = [...(provinciasQuery.data ?? [])].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );
  const localidades = [...(localidadesQuery.data ?? [])].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );
  const provinciaField = register("id_provincia");

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
          {...provinciaField}
          id="id_provincia"
          disabled={provinciasQuery.isLoading}
          onChange={(event) => {
            provinciaField.onChange(event);
            setValue("id_localidad", null);
            setValue("ciudad", "");
          }}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring disabled:opacity-50 [&>option]:bg-background [&>option]:text-foreground"
        >
          <option value="">{provinciasQuery.isLoading ? "Cargando..." : "Seleccioná provincia"}</option>
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
          disabled={provinciaId == null || localidadesQuery.isLoading}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50 [&>option]:bg-background [&>option]:text-foreground"
        >
          <option value="">
            {localidadesQuery.isLoading ? "Buscando ciudades..." : "Seleccioná ciudad"}
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
