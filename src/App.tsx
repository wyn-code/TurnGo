import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/error-boundary";
import RootLayout from "@/components/layout/RootLayout";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/contexts/AuthContext";
import { MembershipProvider } from "@/features/membership/contexts/MembershipContext";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import Index from "./features/landing/pages/Index.tsx";
import Negocios from "./features/business/pages/Negocios.tsx";
import NegocioPerfil from "./features/business/pages/NegocioPerfil.tsx";
import Reservar from "./features/booking/pages/reserva/Reservar.tsx";
import Login from "./features/auth/pages/Login.tsx";
import Registro from "./features/auth/pages/Registro.tsx";
import RegistrarNegocio from "./features/register-business/pages/RegistrarNegocio.tsx";
import Dashboard from "./features/dashboard/pages/Dashboard.tsx";
const ResultadoPago = lazy(() => import("./features/membership/pages/ResultadoPago.tsx"));
import NotFound from "./features/landing/pages/NotFound.tsx";
import AdminPanel from "./features/admin/pages/AdminPanel.tsx";
import { AdminRoute } from "./features/admin/components/AdminRoute.tsx";
import OlvideContrasena from "./features/auth/pages/OlvideContrasena.tsx";
import RestablecerContrasena from "./features/auth/pages/RestablecerContrasena.tsx";
import AuthSuccess from "./features/auth/pages/AuthSuccess";
import 'mapbox-gl/dist/mapbox-gl.css';
import VerifyEmailPage from "./features/auth/pages/VerifyEmailPage.tsx";
import VerificarCodigo from "./features/auth/pages/VerificarCodigo.tsx";


const queryClient = new QueryClient();

const ROUTES_WITHOUT_PAGE_ANIMATION = new Set(["/login", "/registro"]);

const AppRoutes = () => {
  const location = useLocation();
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const isAnimationDisabled = ROUTES_WITHOUT_PAGE_ANIMATION.has(location.pathname);

  const routes = (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Index />} />
      <Route path="/negocios" element={<Negocios />} />
      <Route path="/negocio/:slug" element={<NegocioPerfil />} />
      <Route path="/reservar/:slug" element={<Reservar />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/verificar-codigo" element={<VerificarCodigo />} />
      <Route path="/olvide-contrasena" element={<OlvideContrasena />} />
      <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />

      {/* Rutas protegidas — solo dueños de negocio */}
      <Route path="/registrar-negocio" element={<ProtectedRoute><RegistrarNegocio /></ProtectedRoute>} />
      <Route path="/dashboard/*" element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>} />
      <Route path="/planes" element={<Navigate to="/dashboard/planes" replace />} />
      <Route path="/mi-suscripcion" element={<Navigate to="/dashboard/mi-suscripcion" replace />} />
      <Route path="/admin/*" element={<ErrorBoundary><AdminRoute><AdminPanel /></AdminRoute></ErrorBoundary>} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />}/>
      <Route path="/restablecer-contrasena/:token" element={<RestablecerContrasena />}
      />

      <Route path="/auth-success" element={<AuthSuccess />} />
      <Route path="/pagos/resultado" element={<ResultadoPago />} />

      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  useEffect(() => {
    if (isAnimationDisabled) return;

    const container = pageContainerRef.current;
    if (!container) return;

    const pageRoot = container.firstElementChild as HTMLElement | null;
    if (!pageRoot) return;

    const uniqueCandidates = new Set<HTMLElement>();
    const directChildren = Array.from(pageRoot.children) as HTMLElement[];
    const semanticBlocks = Array.from(
      pageRoot.querySelectorAll("section, article, form, [data-scroll-reveal]")
    ) as HTMLElement[];

    directChildren.forEach((element) => {
      if (element.offsetHeight > 24) uniqueCandidates.add(element);
    });

    semanticBlocks.forEach((element) => uniqueCandidates.add(element));

    const candidates = Array.from(uniqueCandidates);
    if (candidates.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    candidates.forEach((element) => {
      element.classList.add("scroll-reveal");
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [isAnimationDisabled, location.pathname]);

  if (isAnimationDisabled) {
    return <div>{routes}</div>;
  }

  return (
    <div key={location.pathname} ref={pageContainerRef} className="page-enter">
      {routes}
    </div>
  );
};

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  );
}

const SkipLink = () => (
  <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring">
    Saltar al contenido principal
  </a>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SkipLink />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <MembershipProvider>
              <RootLayout>
                <Suspense fallback={<PageLoader />}>
                  <AppRoutes />
                </Suspense>
              </RootLayout>
            </MembershipProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
