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

export function SettingsIncidentPermissions() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const workspaceId = profile?.workspace_id;

  const { data: configs, isLoading } = useQuery({
    queryKey: ["incident-permission-configs"],
    queryFn: async () => {
      const { data, error } = await fromTable("incident_permission_configs").select("*");
      if (error) throw error;
      return (data ?? []) as { id: string; role: string; can_create: boolean; workspace_id: string }[];
    },
  });

  useEffect(() => {
    if (configs) {
      const map: Record<string, boolean> = {};
      ALL_ROLES.forEach(r => {
        const found = configs.find(c => c.role === r.value);
        map[r.value] = found?.can_create ?? false;
      });
      setPermissions(map);
    }
  }, [configs]);

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      for (const role of ALL_ROLES) {
        const existing = configs?.find(c => c.role === role.value);
        if (existing) {
          await fromTable("incident_permission_configs")
            .update({ can_create: permissions[role.value] ?? false })
            .eq("id", existing.id);
        } else {
          await fromTable("incident_permission_configs").insert({
            workspace_id: workspaceId,
            role: role.value,
            can_create: permissions[role.value] ?? false,
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
          Permisos de Creación de Incidentes
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Los roles de Admin y Super Admin siempre pueden crear incidentes. Selecciona qué otros roles tienen permiso.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <Label className="text-sm font-medium">Admin / Super Admin</Label>
            <Switch checked disabled />
          </div>
          {ALL_ROLES.map(role => (
            <div key={role.value} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
              <Label className="text-sm">{role.label}</Label>
              <Switch
                checked={permissions[role.value] ?? false}
                onCheckedChange={(v) => setPermissions(prev => ({ ...prev, [role.value]: v }))}
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Guardando..." : "Guardar Permisos"}
        </Button>
      </CardContent>
    </Card>
  );
}
