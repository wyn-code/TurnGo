import { useEffect, useState } from "react";
import type { ApiNegocio } from "@/types/api";
import { EditBusinessModal } from "@/features/admin/components/EditBusinessModal";
import { DeleteBusinessDialog } from "@/features/admin/components/DeleteBusinessDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { useAdminBusinesses } from "@/hooks/queries/useAdminQueries";
import {
  useDeleteAdminBusiness,
  useUpdateAdminBusiness,
} from "@/hooks/mutations/useAdminMutations";

export function AdminBusinessesSection() {
  const [search, setSearch] = useState("");
  const [editBusiness, setEditBusiness] = useState<ApiNegocio | null>(null);
  const [deleteBusiness, setDeleteBusiness] = useState<ApiNegocio | null>(null);
  const businessesQuery = useAdminBusinesses();
  const updateBusiness = useUpdateAdminBusiness();
  const deleteBusinessMutation = useDeleteAdminBusiness();
  const businesses = businessesQuery.data ?? [];

  useEffect(() => {
    if (!businessesQuery.isError) return;

    console.error("Error cargando negocios:", businessesQuery.error);
    toast.error("No se pudieron cargar los negocios");
  }, [businessesQuery.error, businessesQuery.isError]);

  const filtered = businesses.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.nombre.toLowerCase().includes(q) ||
      b.ciudad.toLowerCase().includes(q) ||
      b.direccion.toLowerCase().includes(q)
    );
  });

  const handleSave = async (updated: ApiNegocio) => {
    try {
      await updateBusiness.mutateAsync({ id: updated.id_negocio, data: updated });
      toast.success("Negocio actualizado");
    } catch (error) {
      console.error("Error actualizando negocio:", error);
      toast.error("No se pudo actualizar el negocio");
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBusinessMutation.mutateAsync(id);
      toast.success("Negocio eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando negocio:", error);
      toast.error("No se pudo eliminar el negocio");
    } finally {
      setDeleteBusiness(null);
    }
  };

  const handleToggleStatus = async (business: ApiNegocio) => {
    const nextActivo = !business.activo;

    try {
      await updateBusiness.mutateAsync({
        id: business.id_negocio,
        data: { activo: nextActivo },
      });

      toast.success(
        nextActivo ? "Negocio autorizado y habilitado" : "Negocio desautorizado",
      );
    } catch (error) {
      console.error("Error cambiando estado del negocio:", error);
      toast.error("No se pudo cambiar el estado del negocio");
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground">Total negocios</p>
          <p className="text-3xl font-bold text-foreground">{businesses.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground">Activos</p>
          <p className="text-3xl font-bold text-primary">
            {businesses.filter((b) => b.activo).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm text-muted-foreground">En ciudades</p>
          <p className="text-3xl font-bold text-foreground">
            {new Set(businesses.map((b) => b.ciudad)).size}
          </p>
        </div>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, ciudad o dirección..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nombre</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Enlace</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No se encontraron negocios
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => (
                <TableRow key={b.id_negocio}>
                  <TableCell className="font-medium">{b.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{b.ciudad}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{b.direccion}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{b.telefono || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.activo ? "default" : "outline"}>
                      {b.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/negocio/${b.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Ver <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(b)}
                        title={b.activo ? "Desautorizar" : "Autorizar"}
                      >
                        {b.activo ? "Desautorizar" : "Autorizar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditBusiness(b)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteBusiness(b)}
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditBusinessModal
        key={editBusiness?.id_negocio ?? "none"}
        business={editBusiness}
        open={!!editBusiness}
        onOpenChange={(o) => !o && setEditBusiness(null)}
        onSave={handleSave}
      />
      <DeleteBusinessDialog
        business={deleteBusiness}
        open={!!deleteBusiness}
        onOpenChange={(o) => !o && setDeleteBusiness(null)}
        onConfirm={() => deleteBusiness && handleDelete(deleteBusiness.id_negocio)}
      />
    </>
  );
}
