import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const fromTable = (table: string) => (supabase as any).from(table);

const ALL_ROLES = [
  { value: "project_manager", label: "Project Manager" },
  { value: "team_lead", label: "Team Lead" },
  { value: "developer", label: "Developer" },
  { value: "qa", label: "QA" },
  { value: "designer", label: "Designer" },
  { value: "architect", label: "Architect" },
  { value: "analyst", label: "Analyst" },
  { value: "stakeholder", label: "Stakeholder" },
  { value: "external_user", label: "Usuario Externo" },
];

interface PermConfig {
  id: string;
  role: string;
  can_create: boolean;
  can_manage: boolean;
  can_close: boolean;
  workspace_id: string;
}

export function SettingsIncidentPermissions() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, { can_create: boolean; can_manage: boolean; can_close: boolean }>>({});

  const workspaceId = profile?.workspace_id;

  const { data: configs, isLoading } = useQuery({
    queryKey: ["incident-permission-configs"],
    queryFn: async () => {
      const { data, error } = await fromTable("incident_permission_configs").select("*");
      if (error) throw error;
      return (data ?? []) as PermConfig[];
    },
  });

  useEffect(() => {
    if (configs) {
      const map: Record<string, { can_create: boolean; can_manage: boolean; can_close: boolean }> = {};
      ALL_ROLES.forEach(r => {
        const found = configs.find(c => c.role === r.value);
        map[r.value] = {
          can_create: found?.can_create ?? false,
          can_manage: found?.can_manage ?? false,
          can_close: found?.can_close ?? false,
        };
      });
      setPermissions(map);
    }
  }, [configs]);

  const toggle = (role: string, field: "can_create" | "can_manage" | "can_close", value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [role]: { ...prev[role], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      for (const role of ALL_ROLES) {
        const existing = configs?.find(c => c.role === role.value);
        const perm = permissions[role.value] ?? { can_create: false, can_manage: false, can_close: false };
        if (existing) {
          await fromTable("incident_permission_configs")
            .update({ can_create: perm.can_create, can_manage: perm.can_manage, can_close: perm.can_close })
            .eq("id", existing.id);
        } else {
          await fromTable("incident_permission_configs").insert({
            workspace_id: workspaceId,
            role: role.value,
            ...perm,
          });
        }
      }
      qc.invalidateQueries({ queryKey: ["incident-permission-configs"] });
      toast({ title: "Permisos de incidentes guardados" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          Permisos de Incidentes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Admin y Super Admin siempre tienen todos los permisos. Configura permisos para los demás roles.
          <br />
          <strong>Nota:</strong> El usuario también debe ser miembro del proyecto para poder operar.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header */}
        <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
          <div>Rol</div>
          <div className="text-center">Crear</div>
          <div className="text-center">Gestionar</div>
          <div className="text-center">Cerrar</div>
        </div>

        {/* Admin row - always enabled */}
        <div className="grid grid-cols-4 gap-2 items-center p-2 rounded-md bg-muted/50">
          <Label className="text-sm font-medium">Admin / Super Admin</Label>
          <div className="text-center"><Switch checked disabled /></div>
          <div className="text-center"><Switch checked disabled /></div>
          <div className="text-center"><Switch checked disabled /></div>
        </div>

        {ALL_ROLES.map(role => {
          const perm = permissions[role.value] ?? { can_create: false, can_manage: false, can_close: false };
          return (
            <div key={role.value} className="grid grid-cols-4 gap-2 items-center p-2 rounded-md hover:bg-muted/50">
              <Label className="text-sm">{role.label}</Label>
              <div className="text-center">
                <Switch checked={perm.can_create} onCheckedChange={v => toggle(role.value, "can_create", v)} />
              </div>
              <div className="text-center">
                <Switch checked={perm.can_manage} onCheckedChange={v => toggle(role.value, "can_manage", v)} />
              </div>
              <div className="text-center">
                <Switch checked={perm.can_close} onCheckedChange={v => toggle(role.value, "can_close", v)} />
              </div>
            </div>
          );
        })}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Guardando..." : "Guardar Permisos"}
        </Button>
      </CardContent>
    </Card>
  );
}
