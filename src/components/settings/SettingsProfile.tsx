import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Save, Upload, Eye, EyeOff } from "lucide-react";

const TIMEZONES = [
  "America/Bogota", "America/Mexico_City", "America/New_York", "America/Chicago",
  "America/Denver", "America/Los_Angeles", "America/Sao_Paulo", "America/Buenos_Aires",
  "Europe/London", "Europe/Madrid", "Europe/Berlin", "Asia/Tokyo", "UTC",
];

export function SettingsProfile() {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? "");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Password
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "El archivo es muy grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("profiles").update({
        full_name: fullName, job_title: jobTitle, avatar_url: avatarUrl,
      }).eq("id", user.id);
      if (error) throw error;

      // Refetch profile data and update local state
      const { data: freshProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (freshProfile) {
        setFullName(freshProfile.full_name ?? "");
        setJobTitle(freshProfile.job_title ?? "");
        setAvatarPreview(null);
        setAvatarFile(null);
      }

      toast({ title: "Perfil actualizado correctamente" });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPass.length < 8) {
      toast({ title: "La contraseña debe tener al menos 8 caracteres", variant: "destructive" });
      return;
    }
    if (newPass !== confirmPass) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      toast({ title: "Contraseña actualizada" });
      setNewPass("");
      setConfirmPass("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setChangingPass(false);
    }
  };

  const passStrength = (() => {
    if (!newPass) return null;
    let score = 0;
    if (newPass.length >= 8) score++;
    if (/[A-Z]/.test(newPass)) score++;
    if (/[0-9]/.test(newPass)) score++;
    if (/[^A-Za-z0-9]/.test(newPass)) score++;
    if (score <= 1) return { label: "Débil", color: "bg-destructive" };
    if (score <= 2) return { label: "Media", color: "bg-yellow-500" };
    return { label: "Fuerte", color: "bg-green-500" };
  })();

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-foreground">Mi Perfil</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">Información Personal</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarPreview || profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Cambiar foto
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Máximo 5MB</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <Label>Nombre completo</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <Label>Cargo / Título profesional</Label>
              <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="ej: Senior Developer" />
            </div>
            <div>
              <Label>Rol</Label>
              <Input value={profile?.role ?? "developer"} disabled className="bg-muted capitalize" />
              <p className="text-xs text-muted-foreground mt-1">Solo un administrador puede cambiar tu rol</p>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile?.email ?? ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">El email no se puede cambiar</p>
            </div>
            <div>
              <Label>Zona horaria</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={saveProfile} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader><CardTitle className="text-base">Cambiar Contraseña</CardTitle></CardHeader>
        <CardContent className="space-y-4 max-w-sm">
          <div>
            <Label>Nueva contraseña</Label>
            <div className="relative">
              <Input type={showPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-muted-foreground">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passStrength && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${passStrength.color} transition-all`} style={{ width: passStrength.label === "Fuerte" ? "100%" : passStrength.label === "Media" ? "60%" : "30%" }} />
                </div>
                <p className="text-xs mt-1 text-muted-foreground">Fortaleza: {passStrength.label}</p>
              </div>
            )}
            <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
              <li className={newPass.length >= 8 ? "text-green-600" : ""}>• Mínimo 8 caracteres</li>
              <li className={/[A-Z]/.test(newPass) ? "text-green-600" : ""}>• Al menos una mayúscula</li>
              <li className={/[0-9]/.test(newPass) ? "text-green-600" : ""}>• Al menos un número</li>
            </ul>
          </div>
          <div>
            <Label>Confirmar contraseña</Label>
            <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
            {confirmPass && newPass !== confirmPass && <p className="text-xs text-destructive mt-1">Las contraseñas no coinciden</p>}
          </div>
          <Button onClick={changePassword} disabled={changingPass || !newPass || newPass !== confirmPass}>
            {changingPass ? "Cambiando..." : "Cambiar contraseña"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
