import type { ReactNode } from "react";
import { Github, Globe, Linkedin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { IconType } from "react-icons";
import {
  SiFastapi,
  SiGooglecloud,
  SiMapbox,
  SiMercadopago,
  SiPostgresql,
  SiReact,
  SiRender,
  SiShadcnui,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
  SiVite,
} from "react-icons/si";

const DEVELOPERS = [
  {
    name: "Massocco Bruno",
    portfolio: "https://www.wyn-code.dev/",
    github: "https://github.com/wyn-code",
    linkedin: "https://www.linkedin.com/in/bruno-massocco-49b113307/",
  },
  {
    name: "Lavecchia Rocco",
    portfolio: "https://portfolio-rocco.vercel.app/",
    github: "https://github.com/lavecchiarocco",
    linkedin: "https://www.linkedin.com/in/rocco-lavecchia-58089917a/",
  },
];

const TECHNOLOGIES: { name: string; icon: IconType }[] = [
  { name: "React", icon: SiReact },
  { name: "TypeScript", icon: SiTypescript },
  { name: "Vite", icon: SiVite },
  { name: "Tailwind CSS", icon: SiTailwindcss },
  { name: "shadcn/ui", icon: SiShadcnui },
  { name: "FastAPI", icon: SiFastapi },
  { name: "PostgreSQL", icon: SiPostgresql },
  { name: "Mercado Pago", icon: SiMercadopago },
  { name: "Mapbox", icon: SiMapbox },
  { name: "Vercel", icon: SiVercel },
  { name: "Render", icon: SiRender },
  { name: "Google Cloud", icon: SiGooglecloud },
];

type SystemInfoDialogProps = {
  trigger: ReactNode;
};

export default function SystemInfoDialog({
  trigger,
}: SystemInfoDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Información del sistema</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            <section className="space-y-2">
              <h3 className="font-semibold text-foreground">Sobre TurnoGo</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                TurnoGo es una plataforma SaaS de gestión de turnos y citas
                para negocios de servicios. Permite a los clientes reservar
                turnos online en segundos, con pagos integrados a través de
                Mercado Pago y búsqueda de negocios por geolocalización.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-foreground">
                Equipo de desarrollo
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {DEVELOPERS.map((dev) => (
                  <div
                    key={dev.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {dev.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={dev.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={`Portafolio de ${dev.name}`}
                      >
                        <Globe className="h-5 w-5" />
                      </a>
                      <a
                        href={dev.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={`GitHub de ${dev.name}`}
                      >
                        <Github className="h-5 w-5" />
                      </a>
                      <a
                        href={dev.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={`LinkedIn de ${dev.name}`}
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-foreground">Tecnologías</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TECHNOLOGIES.map((tech) => (
                  <div
                    key={tech.name}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <tech.icon className="h-5 w-5 shrink-0 text-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {tech.name}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
