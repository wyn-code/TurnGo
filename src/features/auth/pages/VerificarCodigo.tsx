import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";

const VerificarCodigo = () => {
  const { pendingTwoFaEmail, clearPendingTwoFaEmail, verifyTwoFactorCode } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pendingTwoFaEmail) {
      navigate("/login", { replace: true });
    }
  }, [pendingTwoFaEmail, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTwoFaEmail) return;
    setError("");
    if (code.length !== 6) {
      setError("Ingresá los 6 dígitos del código.");
      return;
    }
    setSubmitting(true);
    const result = await verifyTwoFactorCode(pendingTwoFaEmail, code);
    setSubmitting(false);
    if (result.success) {
      clearPendingTwoFaEmail();
      toast.success("Verificación exitosa. ¡Bienvenido/a!");
      navigate("/dashboard", { replace: true });
    } else {
    const msg = "error" in result ? result.error : "No se pudo verificar el código.";
    if (/expir|venc|caduc/i.test(msg)) {
      clearPendingTwoFaEmail();
      toast.error("El código expiró. Iniciá sesión nuevamente.");
      navigate("/login", { replace: true });
      return;
    }
    setError(msg);
  }
  };

  const maskedEmail = pendingTwoFaEmail
    ? pendingTwoFaEmail.replace(/^(.)(.*)(.@.*)$/, (_, a: string, b: string, c: string) => a + "*".repeat(Math.max(b.length, 1)) + c)
    : "";

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <Card className="w-full">
          <CardHeader className="text-center space-y-2 pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Verificación en dos pasos</h1>
            <p className="text-sm text-muted-foreground">
              Ingresá el código de 6 dígitos que enviamos a
            </p>
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
              <Mail size={14} className="text-primary" />
              {maskedEmail}
            </p>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
                {submitting ? "Verificando..." : "Verificar e iniciar sesión"}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  clearPendingTwoFaEmail();
                  navigate("/login", { replace: true });
                }}
                className="hover:underline"
              >
                Volver a iniciar sesión
              </button>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VerificarCodigo;
