import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { CircleUser, LayoutDashboard, LogOut, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/theme-toggle";
import { useAuth } from "@/features/auth/contexts/AuthContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const isAuthRoute =
    location.pathname === "/login" ||
    location.pathname === "/registro";

  const showRegisterBusiness =
    !isLoading && !isAuthenticated && !isAuthRoute;

  // Cerrar menú mobile al navegar
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className="
        sticky
        top-0
        z-50
        border-b
        border-border
        bg-background/80
        backdrop-blur-lg
      "
    >
      <div
        className="
          mx-auto
          flex
          max-w-7xl
          items-center
          justify-between
          px-4
          py-3
          sm:px-6
          lg:px-8
        "
      >
<Link to="/" className="flex items-center gap-2">
  {/* Usar un PNG de buena calidad para la interfaz */}
  <img src="/icon.png" className="h-10 w-15 object-contain" alt="TurnoGo Logo" />
  <span className="text-2xl font-bold">
    TurnoGo
  </span>
</Link>
        {/* DESKTOP */}
        <div
          className="
            hidden
            items-center
            gap-2
            md:flex
          "
        >
          <Button variant="ghost" size="sm" asChild>
            <Link to="/negocios">Explorar negocios</Link>
          </Button>
          {showRegisterBusiness && (
            <Button asChild size="sm">
              <Link to="/registro" className="flex items-center gap-2">
                Registrar negocio
              </Link>
            </Button>
          )}
          
{isAuthenticated ? (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
      >
        <CircleUser className="h-5 w-5" />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
      align="end"
      sideOffset={10}
      className="w-56 rounded-2xl p-0 shadow-xl"
    >
      <button
        type="button"
        onClick={() => navigate("/admin")}
        className="
          flex
          w-full
          items-center
          px-4
          py-3
          text-left
          hover:bg-accent
          transition-colors
        "
      >
        <CircleUser className="mr-3 h-4 w-4" />

        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {user?.name}
          </span>

          <span className="text-xs text-muted-foreground">
            Mi negocio
          </span>
        </div>
      </button>

      <DropdownMenuSeparator className="m-0" />

      <DropdownMenuItem
        onClick={() => {
          logout();
          navigate("/");
        }}
        className="
          h-11
          cursor-pointer
          gap-3
          px-4
          text-destructive
          focus:text-destructive
        "
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
) : (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => navigate("/login")}
  >
    <CircleUser className="h-5 w-5" />
  </Button>
)}
          <ThemeToggle />
        </div>

        {/* MOBILE TOGGLE */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div
          className="
            border-t
            border-border
            bg-background
            md:hidden
          "
        >
          <div className="flex flex-col p-4">
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => navigate("/negocios")}
            >
              Explorar negocios
            </Button>

            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => navigate("/admin")}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>

                <Button
                  variant="ghost"
                  className="justify-start text-destructive"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate("/login")}
              >
                Iniciar sesión
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
