import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { CardContent } from "@/components/ui/card";
import type { ApiCategory, ApiNegocio } from "@/types/api";
import { getCategoryImage } from "@/lib/placeholders";

interface BusinessCardProps {
  business: ApiNegocio;
  categories: ApiCategory[];
}

const BusinessCard = ({ business, categories }: BusinessCardProps) => {
  const category =
    categories.find(
      (cat) => cat.id_categoria === business.id_categoria
    ) ?? null;

  const categoryName = category?.nombre ?? "Sin Categoría";

  const portadaImage = business.imagenes?.find(
    (img) => img.es_portada
  )?.url ?? business.imagenes?.[0]?.url;

  const coverImage =
    business.logo ||
    portadaImage ||
    category?.icono ||
    getCategoryImage(categoryName);

  return (
    <Link
      to={`/negocio/${business.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Imagen */}
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={coverImage}
          alt={business.nombre}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* Contenido */}
      <CardContent className="p-5">
        {/* Categoría */}
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
          {categoryName}
        </span>

        {/* Nombre */}
        <h3 className="mt-1 line-clamp-1 text-lg font-bold text-foreground">
          {business.nombre}
        </h3>

        {/* Ciudad */}
        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">{business.ciudad}</span>
        </div>

        {/* Dirección */}
        <p className="mt-3 min-h-[40px] line-clamp-2 text-sm text-muted-foreground">
          {business.direccion}
        </p>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Disponibilidad
            </p>
            <p className="font-medium text-foreground">
              Reservá online
            </p>
          </div>

        <span className="rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90">
          Reservar
        </span>
        </div>
      </CardContent>
    </Link>
  );
};

export default BusinessCard;