import { useState, useMemo } from "react";
import { useTimeLogs, useDeleteTimeLog, useUpdateTimeLog, type TimeLog } from "@/hooks/useTimeLogs";
import { useProjectMembers } from "@/hooks/useProjects";
import { ManualTimeLogModal } from "@/components/timer/ManualTimeLogModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Clock, CheckCircle2, Circle, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionDeniedDialog } from "@/components/PermissionDeniedDialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ARCHIVED_TOOLTIP = "Proyecto archivado. Restaura el proyecto para editar";

interface Props { projectId: string; isArchived?: boolean; }

export function ProjectTimeTab({ projectId, isArchived = false }: Props) {
  const { profile } = useAuth();
  const { hasScope, guardAction, hasPermission, denied, closeDenied } = usePermissions(projectId);
  const canCreate = hasPermission("tiempo", "crear");
  const canDelete = hasPermission("tiempo", "eliminar");
  const canAprobar = hasPermission("tiempo", "aprobar");
  const canEdit = hasPermission("tiempo", "editar");
  const onlyOwn = hasScope("tiempo", "solo_propios");
  const { data: logs } = useTimeLogs(projectId, (onlyOwn && !canAprobar) ? profile?.id : undefined);
  const { data: members } = useProjectMembers(projectId);
  const deleteLog = useDeleteTimeLog();
  const [showManual, setShowManual] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const queryClient = useQueryClient();

  const toggleApprove = async (logId: string, currentApproved: boolean) => {
    const sb = supabase as any;
    await sb.from("time_logs").update({ approved: !currentApproved }).eq("id", logId);
    queryClient.invalidateQueries({ queryKey: ["time-logs"] });
    toast({ title: currentApproved ? "Aprobación retirada" : "Registro aprobado" });
  };

  const totalHours = useMemo(() => logs?.reduce((a, l) => a + l.hours, 0) ?? 0, [logs]);

  const memberHours = useMemo(() => {
    const map: Record<string, { name: string; hours: number }> = {};
    logs?.forEach(l => {
      if (!map[l.user_id]) map[l.user_id] = { name: l.profiles?.full_name || l.profiles?.email || "?", hours: 0 };
      map[l.user_id].hours += l.hours;
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [logs]);

  const initials = (name: string | null) => name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="h-5 w-5" />Registro de Tiempo</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button size="sm" disabled={isArchived} className={isArchived ? "opacity-50" : ""} onClick={() => guardAction("tiempo", "crear", "registrar tiempo", () => setShowManual(true))}>
                <Plus className="h-4 w-4 mr-1" />Registrar tiempo
              </Button>
            </span>
          </TooltipTrigger>
          {isArchived && <TooltipContent>{ARCHIVED_TOOLTIP}</TooltipContent>}
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Total registrado</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{logs?.length ?? 0}</p><p className="text-xs text-muted-foreground">Registros</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-2xl font-bold">{memberHours.length}</p><p className="text-xs text-muted-foreground">Miembros activos</p></CardContent></Card>
      </div>

      {memberHours.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Horas por miembro</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={memberHours} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <RTooltip />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Registros detallados</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>HU/Tarea</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map(l => (
                <TableRow key={l.id} className={(l as any).approved ? "bg-green-50 dark:bg-green-950/20" : undefined}>
                  <TableCell className="text-sm">{l.log_date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-muted">{initials(l.profiles?.full_name ?? null)}</AvatarFallback></Avatar>
                      <span className="text-sm">{l.profiles?.full_name || l.profiles?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{l.user_stories ? `HU-${l.user_stories.story_number}: ${l.user_stories.title}` : l.tasks?.title || "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{l.hours}h</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-40 truncate">{l.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {canAprobar && !isArchived && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-7 w-7 ${(l as any).approved ? "text-green-600" : "text-muted-foreground"}`}
                              onClick={() =>
                                guardAction("tiempo", "aprobar", "aprobar registro de tiempo", () =>
                                  toggleApprove(l.id, (l as any).approved)
                                )
                              }
                            >
                              {(l as any).approved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{(l as any).approved ? "Aprobado — clic para quitar aprobación" : "Aprobar registro"}</TooltipContent>
                        </Tooltip>
                      )}
                      {(l as any).approved && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] px-1.5 py-0 h-5">Aprobado</Badge>
                      )}
                      {l.user_id === profile?.id && !isArchived && !(l as any).approved && (
                        <>
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLog(l)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => guardAction("tiempo", "eliminar", "eliminar registro de tiempo", () => deleteLog.mutate(l.id))}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!logs || logs.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin registros de tiempo</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isArchived && <ManualTimeLogModal open={showManual} onOpenChange={setShowManual} projectId={projectId} />}
      {!isArchived && (
        <ManualTimeLogModal
          open={!!editingLog}
          onOpenChange={(open) => { if (!open) setEditingLog(null); }}
          projectId={projectId}
          editLog={editingLog ? { id: editingLog.id, hours: editingLog.hours, log_date: editingLog.log_date, description: editingLog.description, user_story_id: editingLog.user_story_id } : undefined}
          onUpdated={() => setEditingLog(null)}
        />
      )}
      <PermissionDeniedDialog open={denied.open} onOpenChange={closeDenied} actionLabel={denied.actionLabel} requiredPermission={denied.requiredPermission} />
    </div>
  );
}
