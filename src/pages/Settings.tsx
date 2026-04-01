import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSlaConfigs, useUpsertSlaConfig } from "@/hooks/useIncidents";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Save } from "lucide-react";

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

export default function Settings() {
  const { profile } = useAuth();
  const { data: configs } = useSlaConfigs();
  const upsertSla = useUpsertSlaConfig();

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

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle>SLA de Incidentes</CardTitle>
        </CardHeader>
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
    </div>
  );
}
