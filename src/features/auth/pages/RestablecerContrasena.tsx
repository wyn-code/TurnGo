import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ShieldCheck, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const schema = z.object({
  password: z
    .string()
    .min(12, "La contraseña debe tener al menos 12 caracteres")
    .max(16, "La contraseña debe tener máximo 16 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_-])[A-Za-z\d@$!%*?&.#_-]{12,16}$/,
      "Debe incluir mayúsculas, minúsculas, números y un carácter especial",
    ),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});
type FormData = z.infer<typeof schema>;

const RestablecerContrasena = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const { token } = useParams();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);



  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
  setServerError("");

  if (!token) {
    setServerError(
      "El enlace no es válido o expiró. Solicitá uno nuevo."
    );
    return;
  }

  const result = await resetPassword(
    token,
    data.password,
    data.confirmPassword
  );

  if (result.success) {
    setSuccess(true);
    setTimeout(() => navigate("/login"), 2000);
  } else {
    setServerError(
      result.error ||
      "No pudimos restablecer tu contraseña."
    );
  }
};
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Card className="w-full">
          {success ? (
            <>
              <CardHeader className="text-center space-y-2 pb-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">¡Contraseña actualizada!</h1>
                <p className="text-sm text-muted-foreground">
                  Te estamos redirigiendo al inicio de sesión...
                </p>
              </CardHeader>
            </>
          ) : (
            <>
              <CardHeader className="text-center space-y-2 pb-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Restablecer contraseña</h1>
                <p className="text-sm text-muted-foreground">
                  Elegí una nueva contraseña segura para tu cuenta.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {serverError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle size={16} /> {serverError}
                    {!token && (
                      <Link to="/olvide-contrasena" className="ml-1 font-medium underline">
                        Solicitá uno nuevo
                      </Link>
                    )}
                  </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Contraseña nueva</Label>
                    <div className="relative">
                      <Input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar contraseña nueva</Label>
                    <div className="relative">
                      <Input {...register("confirmPassword")} type={showConfirm ? "text" : "password"} placeholder="••••••" />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/40 p-3">
                    La contraseña debe tener entre 12 y 16 caracteres, con al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial.
                  </p>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : "Aceptar"}
                  </Button>
                </form>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Volver al inicio de sesión
                  </Link>
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  );
};

export default RestablecerContrasena;
