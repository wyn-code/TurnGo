import { Link } from "react-router-dom";
import TermsAndConditionsDialog from "@/components/legal/TermsAndConditionsDialog";
import SystemInfoDialog from "@/components/system-info/SystemInfoDialog";

const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
    {children}
  </a>
);

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Link to="/" className="text-xl font-bold text-foreground">TurnoGo</Link>
          <p className="text-sm text-muted-foreground">
            Reservá turnos online en los mejores negocios de servicios.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Explorar</h4>
          <div className="flex flex-col gap-2">
            <FooterLink href="/negocios">Negocios</FooterLink>
            <FooterLink href="/">Inicio</FooterLink>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Para negocios</h4>
          <div className="flex flex-col gap-2">
            <FooterLink href="/registro">Registrar mi negocio</FooterLink>
            <FooterLink href="/login">Iniciar sesión</FooterLink>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Legal</h4>
          <div className="flex flex-col gap-2">
            <TermsAndConditionsDialog
              trigger={
                <button type="button" className="text-left text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Términos y condiciones
                </button>
              }
            />
            <SystemInfoDialog
              trigger={
                <button type="button" className="text-left text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Información del sistema
                </button>
              }
            />
          </div>
        </div>
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} TurnoGo. Todos los derechos reservados.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
