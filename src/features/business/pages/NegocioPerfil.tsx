import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PLACEHOLDER_IMAGE } from "@/lib/placeholders";

import { businessService } from "@/services/business.service";
import { servicioService } from "@/services/servicio.service";
import { empleadoService } from "@/services/empleado.service";
import type { ApiNegocio, ApiEmpleado, ApiServicio } from "@/types/api";

import Map from "@/features/business/components/Map";
import HorarioCard from "@/features/business/components/HorarioCard";
import ProfessionalCard from "@/features/business/components/ProfessionalCard";
import { Instagram, MapPin, Phone } from "lucide-react";

const NegocioPerfil = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [business, setBusiness] = useState<ApiNegocio | null>(null);
  const [services, setServices] = useState<ApiServicio[]>([]);
  const [professionals, setProfessionals] = useState<ApiEmpleado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);;

  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        if (!slug) {
          throw new Error("Slug no recibido");
        }

        setIsLoading(true);
        setError(null);

        const businessData = await businessService.getBusinessBySlug(slug);

        setBusiness(businessData);

        const [servicesData, professionalsData] = await Promise.all([
          servicioService.getByBusiness(businessData.id_negocio),
          empleadoService.getByBusiness(businessData.id_negocio),
        ]);

        setServices(servicesData);
        setProfessionals(professionalsData);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el negocio");
      } finally {
        setIsLoading(false);
      }
    };

    loadBusinessData();
  }, [slug]);

  const handleBook = (service: ApiServicio) => {
    if (!business?.slug) return;

    navigate(`/reservar/${business.slug}?servicio=${service.id_servicio}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <p>Cargando negocio...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">
            Negocio no encontrado
          </h1>

          <Button asChild className="mt-4">
            <Link to="/negocios">Ver todos los negocios</Link>
          </Button>
        </div>
      </div>
    );
  }
  const portada =
    business.imagenes?.find((img) => img.es_portada)?.url ||
    business.imagenes?.[0]?.url ||
    business.logo ||
    business.categoria?.icono ||
    PLACEHOLDER_IMAGE;

  const perfilFoto =
    business.logo ||
    business.categoria?.icono ||
    PLACEHOLDER_IMAGE;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8">

        {/* HEADER DEL NEGOCIO */}
        <div className="mb-10">

          <div className="flex items-center gap-4">

            <img
              src={perfilFoto}
              alt={`Logo de ${business.nombre}`}
              className="h-24 w-24 rounded-full border border-border object-cover"
            />

            <div>
              <h1 className="text-5xl font-bold">
                {business.nombre}
              </h1>

              {business.categoria && (
                <span className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
                  {business.categoria.icono && (
                    <img
                      src={business.categoria.icono}
                      alt={business.categoria.nombre}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  )}
                  {business.categoria.nombre}
                </span>
              )}
            </div>

          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-muted-foreground">

            <div className="flex items-center gap-2">
              <MapPin size={16} />
              {business.direccion}, {business.ciudad}
            </div>

            {business.telefono && (
              <div className="flex items-center gap-2">
                <Phone size={16} />
                {business.telefono}
              </div>
            )}

            {business.ig_url && (
              <a
                href={business.ig_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-primary"
              >
                <Instagram size={16} />
                Instagram
              </a>
            )}

          </div>

          {business.descripcion && (
            <p className="mt-6 max-w-4xl text-lg text-muted-foreground">
              {business.descripcion}
            </p>
          )}

        </div>
        {/* GALERÍA */}
        <div className="mb-10">

          {business.imagenes && business.imagenes.length > 0 ? (

            <div className="grid gap-3 lg:grid-cols-3">

              <div className="lg:col-span-2">

                <img
                  src={portada}
                  alt={business.nombre}
                  className="h-[500px] w-full rounded-3xl object-cover"
                />

              </div>

              <div className="grid gap-3">

                {business.imagenes
                  .filter((img) => img.url !== portada)
                  .slice(0, 2)
                  .map((img) => (
                    <img
                      key={img.id_imagen}
                      src={img.url}
                      alt={business.nombre}
                      className="h-[244px] w-full rounded-3xl object-cover"
                    />
                  ))}

              </div>

            </div>

          ) : (

            <img
              src={portada}
              alt={business.nombre}
              className="h-[500px] w-full rounded-3xl object-cover"
            />

          )}

        </div>

        {/* CONTENIDO */}
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* IZQUIERDA */}
          <div>
            {/* SERVICIOS */}
            <section>
              <h2 className="mb-5 text-2xl font-semibold">Servicios</h2>

              <div className="overflow-hidden rounded-2xl border bg-card">
                {services.length > 0 ? (
                  services.map((service) => (
                    <div
                      key={service.id_servicio}
                      className="flex items-center justify-between border-b p-6 last:border-b-0"
                    >
                      <div>
                        <h3 className="font-semibold text-lg">
                          {service.nombre_servicio}
                        </h3>

                        <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                          <span>
                            {service.duracion_min === service.duracion_max
                              ? `${service.duracion_min} min`
                              : `${service.duracion_min} - ${service.duracion_max} min`}
                          </span>

                          <span>
                            ${Number(service.precio).toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>

                      <Button onClick={() => handleBook(service)}>
                        Reservar
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-muted-foreground">
                    No hay servicios disponibles.
                  </div>
                )}
              </div>
            </section>

            {/* HORARIOS */}
            {business.horarios && business.horarios.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-4 text-2xl font-semibold">Horarios</h2>

                <HorarioCard horarios={business.horarios} />
              </section>
            )}

            {/* MAPA */}
            {business.tiene_mapa && business.latitud && business.longitud && (
              <section className="mt-10 rounded-xl border bg-card p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Ubicación</h2>

                  <p className="text-sm text-muted-foreground">
                    {business.direccion}, {business.ciudad}
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border">
                  <Map
                    latitud={business.latitud}
                    longitud={business.longitud}
                    nombre={business.nombre}
                  />
                </div>

                <div className="mt-4">
                  <Button asChild variant="outline">
                    <a
                      href={`https://www.google.com/maps?q=${business.latitud},${business.longitud}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Cómo llegar
                    </a>
                  </Button>
                </div>
              </section>
            )}

            {/* PROFESIONALES */}
            {professionals.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-4 text-2xl font-semibold">Profesionales</h2>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {professionals.map((professional) => (
                    <ProfessionalCard
                      key={professional.id_empleado}
                      professional={professional}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Desde
              </p>

              <h2 className="mt-2 text-5xl font-bold">
                $
                {services.length > 0
                  ? Math.min(
                      ...services.map((s) => Number(s.precio)),
                    ).toLocaleString("es-AR")
                  : "0"}
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Pagás directamente en el local
              </p>

              <Button className="mt-6 w-full" size="lg" asChild>
                <Link to={`/reservar/${business.slug}`}>Reservar turno</Link>
              </Button>

              <div className="mt-6 border-t pt-6 space-y-3 text-sm">
                <div>✅ Confirmación inmediata</div>

                <div>✅ Cancelación gratuita</div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default NegocioPerfil;
