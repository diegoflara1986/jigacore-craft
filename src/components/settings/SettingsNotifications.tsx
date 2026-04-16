import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

const NOTIFICATION_TYPES = [
  { key: "tarea_asignada", label: "Tarea asignada a mí", icon: "📋" },
  { key: "mencion", label: "Me mencionaron en comentario", icon: "💬" },
  { key: "cambio_estado", label: "Cambio de estado en mis tareas", icon: "🔄" },
  { key: "sprint_iniciado", label: "Sprint iniciado", icon: "🚀" },
  { key: "sprint_completado", label: "Sprint completado", icon: "✅" },
  { key: "tarea_vencida", label: "Mis tareas vencidas", icon: "⏰" },
  { key: "nuevo_incidente", label: "Nuevo incidente", icon: "🐛" },
  { key: "presupuesto_alerta", label: "Alerta de presupuesto", icon: "💰" },
  { key: "estimation_invite", label: "Invitación a estimación", icon: "📊" },
];

export function SettingsNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: prefs } = useQuery({
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

  const prefsMap = (prefs ?? []).reduce((acc: any, p: any) => {
    acc[p.notification_type] = { in_app: p.in_app, by_email: p.by_email, id: p.id };
    return acc;
  }, {} as Record<string, { in_app: boolean; by_email: boolean; id: string }>);

  const togglePref = useMutation({
    mutationFn: async ({ type, field, value }: { type: string; field: "in_app" | "by_email"; value: boolean }) => {
      const existing = prefsMap[type];
      if (existing) {
        const updateData = field === "in_app" ? { in_app: value } : { by_email: value };
        const { error } = await supabase.from("notification_preferences").update(updateData).eq("id", existing.id);
        if (error) throw error;
      } else {
        const insertData = { user_id: user!.id, notification_type: type, in_app: field === "in_app" ? value : true, by_email: field === "by_email" ? value : false };
        const { error } = await supabase.from("notification_preferences").insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-foreground">Mis Notificaciones</h2>
      <Card>
        <CardHeader><CardTitle className="text-base">Preferencias de Notificación</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center w-20">En App</TableHead>
                <TableHead className="text-center w-20">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NOTIFICATION_TYPES.map(nt => {
                const pref = prefsMap[nt.key];
                return (
                  <TableRow key={nt.key}>
                    <TableCell><span className="mr-2">{nt.icon}</span>{nt.label}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={pref?.in_app ?? true} onCheckedChange={v => togglePref.mutate({ type: nt.key, field: "in_app", value: v })} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={pref?.by_email ?? false} onCheckedChange={v => togglePref.mutate({ type: nt.key, field: "by_email", value: v })} />
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
