import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KeyRound, AlertCircle, MailCheck } from "lucide-react";

const schema = z.object({
  email: z.string().email("Ingresá un email válido"),
});
type FormData = z.infer<typeof schema>;

const OlvideContrasena = () => {
  const { requestPasswordReset } = useAuth();
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    const result = await requestPasswordReset(data.email);
    if (result.success) {
      setSentEmail(data.email);
      setSent(true);
    } else {
      setServerError(result.error || "No pudimos procesar tu solicitud.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Card className="w-full">
          {!sent ? (
            <>
              <CardHeader className="text-center space-y-2 pb-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">¿Olvidaste tu contraseña?</h1>
                <p className="text-sm text-muted-foreground">
                  Ingresá tu email y te enviaremos un enlace para restablecerla.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {serverError && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle size={16} /> {serverError}
                  </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input {...register("email")} type="email" placeholder="tu@email.com" />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Enviando..." : "Enviar enlace"}
                  </Button>
                </form>
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Volver al inicio de sesión
                  </Link>
                </p>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center space-y-2 pb-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                  <MailCheck className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">¡Email enviado!</h1>
                <p className="text-sm text-muted-foreground">
                  Te enviamos un enlace para restablecer tu contraseña a <strong>{sentEmail}</strong>. Revisá tu bandeja de entrada.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
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

export default OlvideContrasena;
