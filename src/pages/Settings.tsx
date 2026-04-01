import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useSlaConfigs, useUpsertSlaConfig } from "@/hooks/useIncidents";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DEFAULT_SLA: Record<string, { response: number; resolution: number }> = {
  critica: { response: 2, resolution: 8 },
  alta: { response: 8, resolution: 24 },
  media: { response: 24, resolution: 72 },
  baja: { response: 72, resolution: 168 },
};

const SEV_LABELS: Record<string, string> = {
  critica: "🔴 Crítica",
  alta: "🟠 Alta",
  media: "🟡 Media",
  baja: "🟢 Baja",
};

const NOTIFICATION_TYPES = [
  { key: "tarea_asignada", label: "Tarea asignada a mí", icon: "📋" },
  { key: "mencion", label: "Me mencionaron en comentario", icon: "💬" },
  { key: "cambio_estado", label: "Cambio de estado en mis tareas", icon: "🔄" },
  { key: "sprint_iniciado", label: "Sprint iniciado", icon: "🚀" },
  { key: "sprint_completado", label: "Sprint completado", icon: "✅" },
  { key: "tarea_vencida", label: "Mis tareas vencidas", icon: "⏰" },
  { key: "nuevo_incidente", label: "Nuevo incidente", icon: "🐛" },
  { key: "presupuesto_alerta", label: "Alerta de presupuesto", icon: "💰" },
  { key: "planning_poker", label: "Invitación a Planning Poker", icon: "🃏" },
];

export default function Settings() {
  const { profile, user } = useAuth();
  const { data: configs } = useSlaConfigs();
  const upsertSla = useUpsertSlaConfig();
  const qc = useQueryClient();

  const { data: workspaceId } = useQuery({
    queryKey: ["workspace-id"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_user_workspace_id");
      return data as string;
    },
  });

  const [sla, setSla] = useState<Record<string, { response: number; resolution: number }>>(DEFAULT_SLA);

  useEffect(() => {
    if (configs?.length) {
      const map: Record<string, { response: number; resolution: number }> = { ...DEFAULT_SLA };
      configs.forEach((c: any) => {
        map[c.severity] = { response: c.response_hours, resolution: c.resolution_hours };
      });
      setSla(map);
    }
  }, [configs]);

  const saveSla = () => {
    if (!workspaceId) return;
    const entries = Object.entries(sla).map(([severity, vals]) => ({
      workspace_id: workspaceId,
      severity,
      response_hours: vals.response,
      resolution_hours: vals.resolution,
    }));
    upsertSla.mutate(entries);
  };

  // Notification preferences
  const { data: notifPrefs } = useQuery({
    queryKey: ["notification-prefs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const prefsMap = (notifPrefs ?? []).reduce((acc: any, p: any) => {
    acc[p.notification_type] = { in_app: p.in_app, by_email: p.by_email, id: p.id };
    return acc;
  }, {} as Record<string, { in_app: boolean; by_email: boolean; id: string }>);

  const togglePref = useMutation({
    mutationFn: async ({ type, field, value }: { type: string; field: "in_app" | "by_email"; value: boolean }) => {
      const existing = prefsMap[type];
      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update({ [field]: value })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user!.id, notification_type: type, [field]: value });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Configuración</h1>

      {/* SLA Config */}
      <Card>
        <CardHeader><CardTitle>SLA de Incidentes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severidad</TableHead>
                <TableHead>Tiempo de Respuesta (horas)</TableHead>
                <TableHead>Tiempo de Resolución (horas)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(sla).map(([severity, vals]) => (
                <TableRow key={severity}>
                  <TableCell className="font-medium">{SEV_LABELS[severity] || severity}</TableCell>
                  <TableCell>
                    <Input type="number" min={1} className="w-24" value={vals.response}
                      onChange={e => setSla(p => ({ ...p, [severity]: { ...p[severity], response: Number(e.target.value) } }))} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min={1} className="w-24" value={vals.resolution}
                      onChange={e => setSla(p => ({ ...p, [severity]: { ...p[severity], resolution: Number(e.target.value) } }))} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button className="mt-4" onClick={saveSla} disabled={upsertSla.isPending}>
            <Save className="h-4 w-4 mr-2" /> Guardar configuración SLA
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader><CardTitle>Mis Notificaciones</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de notificación</TableHead>
                <TableHead className="text-center w-24">En App</TableHead>
                <TableHead className="text-center w-24">Por Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NOTIFICATION_TYPES.map(nt => {
                const pref = prefsMap[nt.key];
                return (
                  <TableRow key={nt.key}>
                    <TableCell className="font-medium">
                      <span className="mr-2">{nt.icon}</span>{nt.label}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={pref?.in_app ?? true}
                        onCheckedChange={(v) => togglePref.mutate({ type: nt.key, field: "in_app", value: v })}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={pref?.by_email ?? false}
                        onCheckedChange={(v) => togglePref.mutate({ type: nt.key, field: "by_email", value: v })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
