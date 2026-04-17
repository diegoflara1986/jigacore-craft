import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCustomRoles } from "@/hooks/useCustomRoles";
import { useQueryClient } from "@tanstack/react-query";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; full_name: string | null; role: string; role_id: string | null; email: string } | null;
  onSaved: () => void;
}

export function EditUserDialog({ open, onOpenChange, user, onSaved }: EditUserDialogProps) {
  const [fullName, setFullName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data: customRoles } = useCustomRoles();
  const qc = useQueryClient();

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? "");
      setRoleId(user.role_id ?? "");
      setPassword("");
      setShowPassword(false);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const selectedRole = customRoles?.find(r => r.id === roleId);
      const baseRole = (selectedRole?.base_role ?? "external_user") as any;

      console.log("Guardando:", {
        userId: user.id,
        role_id: roleId,
        role: baseRole,
        full_name: fullName,
      });

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          role_id: roleId || null,
          role: baseRole,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Password change still uses the edge function (admin auth API)
      if (password.length > 0) {
        const hasMinLength = password.length >= 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        if (!hasMinLength || !hasUppercase || !hasNumber) {
          const errors: string[] = [];
          if (!hasMinLength) errors.push("mínimo 8 caracteres");
          if (!hasUppercase) errors.push("al menos una mayúscula");
          if (!hasNumber) errors.push("al menos un número");
          toast({ title: "Contraseña no válida", description: `Debe tener: ${errors.join(", ")}`, variant: "destructive" });
          setSaving(false);
          return;
        }
        const res = await supabase.functions.invoke("create-user", {
          body: { action: "update", user_id: user.id, password },
        });
        if (res.error) throw new Error(res.error.message);
        if (res.data?.error) throw new Error(res.data.error);
      }

      toast({ title: "Usuario actualizado correctamente" });
      onSaved();
      qc.invalidateQueries({ queryKey: ["workspace-users"] });
      qc.invalidateQueries({ queryKey: ["custom-roles-with-count"] });
      onOpenChange(false);
    } catch (e: any) {
      console.error("Error al guardar usuario:", e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Nombre completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre del usuario" />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            {(() => { console.log("roles disponibles:", customRoles); return null; })()}
            <Select value={roleId || undefined} onValueChange={setRoleId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
              <SelectContent>
                {(customRoles ?? []).filter((r) => r.name?.toLowerCase() !== "super admin" && r.base_role !== "super_admin").map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.icon} {r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nueva contraseña <span className="text-muted-foreground text-xs">(dejar vacío para no cambiar)</span></Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-0.5 h-8 w-8" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
