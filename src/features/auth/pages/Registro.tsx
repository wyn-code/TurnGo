// pages/Registro.tsx
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import TermsAndConditionsDialog from "@/components/legal/TermsAndConditionsDialog";
import { UserPlus, AlertCircle, Eye, EyeOff } from "lucide-react";
import { SocialAuthButtons } from "@/features/auth/components/SocialAuthButtons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


const schema = z
  .object({
    nombre: z.string().min(2, "Ingresá tu nombre"),
    apellido: z.string().min(2, "Ingresá tu apellido"),
    usuario: z
      .string()
      .min(3, "Mínimo 3 caracteres")
      .max(30, "Máximo 30 caracteres"),
    email: z.string().email("Ingresá un email válido"),
    password: z
      .string()
      .min(12, "La contraseña debe tener al menos 12 caracteres")
      .max(16, "La contraseña debe tener máximo 16 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_-])[A-Za-z\d@$!%*?&.#_-]{12,16}$/,
        "Debe incluir mayúsculas, minúsculas, números y un carácter especial",
      ),
    confirmPassword: z.string(),
    acceptedTerms: z.boolean().refine((v) => v, {
      message: "Debés aceptar los Términos y Condiciones",
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const Registro = () => {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/dashboard";
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Estado para el ojo
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const {
  register,
  handleSubmit,
  watch,
  setValue,
  formState: { errors, isSubmitting },
} = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    acceptedTerms: false,
  },
});

const passwordValue = watch("password", "");

const passwordChecks = {
  length:
    passwordValue.length >= 12 &&
    passwordValue.length <= 16,

  uppercase: /[A-Z]/.test(passwordValue),

  lowercase: /[a-z]/.test(passwordValue),

  number: /\d/.test(passwordValue),

  special: /[@$!%*?&.#_-]/.test(passwordValue),
};

const onSubmit = async (data: FormData) => {
  setServerError("");

  const result = await authRegister(
    data.usuario,
    data.email,
    data.password,
    data.nombre,
    data.apellido,
  );

  if (result.success) {
    setShowVerifyModal(true);
    return;
  }

  setServerError(result.error);
};

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Card className="w-full">
          <CardHeader className="text-center space-y-2 pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Creá tu cuenta
            </h1>
            <p className="text-sm text-muted-foreground">
              ¿Querés registrar tu negocio?
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {serverError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} /> {serverError}
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input {...register("nombre")} placeholder="Juan" />
                  {errors.nombre && (
                    <p className="text-xs text-destructive">
                      {errors.nombre.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input {...register("apellido")} placeholder="Pérez" />
                  {errors.apellido && (
                    <p className="text-xs text-destructive">
                      {errors.apellido.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nombre de usuario</Label>
                <Input {...register("usuario")} placeholder="tu_usuario" />
                {errors.usuario && (
                  <p className="text-sm text-destructive">
                    {errors.usuario.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="tu@email.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Contraseña</Label>
                <div className="relative">
                  <Input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="12-16 caracteres"
                    className={
                      passwordValue.length > 0
                        ? Object.values(passwordChecks).every(Boolean)
                          ? "border-green-500 focus-visible:ring-green-500"
                          : "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
                <div className="space-y-1 text-xs">
                  <p
                    className={
                      passwordChecks.length
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }
                  >
                    ✓ Entre 12 y 16 caracteres
                  </p>

                  <p
                    className={
                      passwordChecks.uppercase
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }
                  >
                    ✓ Al menos una mayúscula
                  </p>

                  <p
                    className={
                      passwordChecks.lowercase
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }
                  >
                    ✓ Al menos una minúscula
                  </p>

                  <p
                    className={
                      passwordChecks.number
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }
                  >
                    ✓ Al menos un número
                  </p>

                  <p
                    className={
                      passwordChecks.special
                        ? "text-green-500"
                        : "text-muted-foreground"
                    }
                  >
                    ✓ Al menos un carácter especial (@$!%*?&.#_-)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    {...register("confirmPassword")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Repetí tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3 rounded-md border border-border p-3">
                  <Checkbox
                    id="acceptedTerms"
                    checked={watch("acceptedTerms")}
                    onCheckedChange={(checked) => {
                      setValue("acceptedTerms", checked === true, {
                        shouldValidate: true,
                      });
                    }}
                  />
                  <Label
                    htmlFor="acceptedTerms"
                    className="text-sm font-normal leading-5 cursor-pointer"
                  >
                    Acepto los{" "}
                    <TermsAndConditionsDialog
                      trigger={
                        <button
                          type="button"
                          onClick={(event) => event.stopPropagation()}
                          className="text-primary underline underline-offset-4"
                        >
                          Términos y Condiciones de Uso
                        </button>
                      }
                    />
                    .
                  </Label>
                </div>
                {errors.acceptedTerms && (
                  <p className="text-sm text-destructive">
                    {errors.acceptedTerms.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>

            <SocialAuthButtons
              onNeedsVerification={() => setShowVerifyModal(true)}
            />

            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{" "}
              <Link
                to="/login"
                state={{ from }}
                className="font-medium text-primary hover:underline"
              >
                Iniciá sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <Dialog
  open={showVerifyModal}
  onOpenChange={setShowVerifyModal}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        Revisá tu correo
      </DialogTitle>

      <DialogDescription>
        Tu cuenta fue creada correctamente.

        Te enviamos un email de verificación.
        Hacé clic en el enlace para activar tu cuenta.
      </DialogDescription>
    </DialogHeader>

    <Button
      className="w-full"
      onClick={() => navigate("/")}
    >
      Ir al inicio
    </Button>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default Registro;
