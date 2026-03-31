import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Hexagon } from "lucide-react";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    if (!acceptTerms) {
      toast({ title: "Error", description: "Debes aceptar los términos y condiciones", variant: "destructive" });
      return;
    }
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) {
      toast({ title: "Error al registrarse", description: authError.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Create workspace if name provided
    if (authData.user && workspaceName) {
      const { data: ws } = await supabase.from("workspaces").insert({ name: workspaceName }).select().single();
      if (ws) {
        await supabase.from("profiles").update({ workspace_id: ws.id, full_name: fullName }).eq("id", authData.user.id);
      }
    }

    setLoading(false);
    toast({ title: "¡Cuenta creada!", description: "Revisa tu correo para confirmar tu cuenta." });
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex items-center gap-2">
            <Hexagon className="h-10 w-10 text-accent" />
            <span className="text-2xl font-bold text-foreground">Jigacore PM</span>
          </div>
          <p className="text-muted-foreground text-sm">Crea tu cuenta</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Pérez" required />
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="space-y-2">
              <Label>Confirmar contraseña</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="space-y-2">
              <Label>Nombre de la empresa / workspace</Label>
              <Input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Mi Empresa" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} />
              <Label htmlFor="terms" className="text-sm text-muted-foreground">
                Acepto los términos y condiciones
              </Label>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
              {loading ? "Registrando..." : "Registrarse"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-accent hover:underline">Iniciar sesión</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
