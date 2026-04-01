import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FolderKanban, CheckCircle2, Clock, ListTodo, Bell
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

function MetricCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <Card className="border-border">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const priorityColors: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-accent text-accent-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-muted text-muted-foreground",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Activo", color: "bg-success text-success-foreground" },
  paused: { label: "En Pausa", color: "bg-warning text-warning-foreground" },
  planning: { label: "Planificación", color: "bg-info text-info-foreground" },
  completed: { label: "Completado", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelado", color: "bg-destructive text-destructive-foreground" },
  archived: { label: "Archivado", color: "bg-muted text-muted-foreground" },
};

export default function Dashboard() {
  usePageTitle("Dashboard");
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: projects } = useQuery({
    queryKey: ["projects-count"],
    queryFn: async () => {
      const { count } = await supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active");
      return count ?? 0;
    },
  });

  const { data: myTasks } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      if (!profile) return [];
      const { data } = await supabase
        .from("tasks")
        .select("*, projects(name)")
        .eq("assigned_to", profile.id)
        .neq("status", "done")
        .order("due_date", { ascending: true })
        .limit(10);
      return data ?? [];
    },
    enabled: !!profile,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!profile) return [];
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!profile,
  });

  const { data: recentProjects } = useQuery({
    queryKey: ["recent-projects-enriched"],
    queryFn: async () => {
      const { data: projs } = await supabase
        .from("projects")
        .select("*")
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!projs?.length) return [];

      // Enrich each project with stats, members, active sprint
      const enriched = await Promise.all(projs.map(async (p) => {
        const [storiesRes, membersRes, sprintRes] = await Promise.all([
          supabase.from("user_stories").select("status").eq("project_id", p.id).is("deleted_at", null),
          supabase.from("project_members").select("id, profiles(full_name)").eq("project_id", p.id).limit(5),
          supabase.from("sprints").select("name").eq("project_id", p.id).eq("status", "active").limit(1),
        ]);
        const stories = storiesRes.data ?? [];
        const total = stories.length;
        const completed = stories.filter(s => s.status === "done").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          ...p,
          progress,
          members: (membersRes.data ?? []) as any[],
          activeSprint: sprintRes.data?.[0]?.name ?? null,
        };
      }));
      return enriched;
    },
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const initials = (name: string | null) => name ? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting()}, {profile?.full_name?.split(" ")[0] || "Usuario"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Aquí tienes un resumen de tu trabajo</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Proyectos Activos" value={projects ?? 0} icon={FolderKanban} color="bg-primary/10 text-primary" />
        <MetricCard title="Mis Tareas en Sprint" value={myTasks?.length ?? 0} icon={ListTodo} color="bg-accent/10 text-accent" />
        <MetricCard title="Completadas Hoy" value={0} icon={CheckCircle2} color="bg-success/10 text-success" />
        <MetricCard title="Horas Esta Semana" value="0h" icon={Clock} color="bg-info/10 text-info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Mis Tareas Pendientes</CardTitle></CardHeader>
          <CardContent>
            {!myTasks?.length ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No tienes tareas pendientes 🎉</p>
            ) : (
              <div className="space-y-2">
                {myTasks.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.projects?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge className={priorityColors[task.priority] || "bg-muted text-muted-foreground"} variant="secondary">{task.priority}</Badge>
                      {task.due_date && <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(task.due_date).toLocaleDateString("es")}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Bell className="h-4 w-4" /> Notificaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {!notifications?.length ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Sin notificaciones nuevas</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n: any) => (
                  <div key={n.id} className="p-3 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects - enriched */}
      <Card className="border-border">
        <CardHeader className="pb-3"><CardTitle className="text-lg">Proyectos Recientes</CardTitle></CardHeader>
        <CardContent>
          {!recentProjects?.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Aún no hay proyectos creados</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((p: any) => {
                const st = statusConfig[p.status] || statusConfig.active;
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/proyectos/${p.id}`)}
                    className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-md flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: p.color || "#1E3A5F" }}>
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground text-sm truncate">{p.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{p.client_name || "Sin cliente"}</p>
                        </div>
                      </div>
                      <Badge className={`${st.color} text-[10px] px-1.5 shrink-0`}>{st.label}</Badge>
                    </div>

                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progreso</span>
                        <span>{p.progress}%</span>
                      </div>
                      <Progress value={p.progress} className="h-1.5" />
                    </div>

                    {p.activeSprint && (
                      <p className="text-xs text-accent mt-2">🏃 {p.activeSprint}</p>
                    )}

                    {(p.start_date || p.end_date) && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {p.start_date ? new Date(p.start_date).toLocaleDateString("es") : "—"} → {p.end_date ? new Date(p.end_date).toLocaleDateString("es") : "—"}
                      </p>
                    )}

                    {p.members?.length > 0 && (
                      <div className="flex -space-x-2 mt-2">
                        {p.members.slice(0, 4).map((m: any) => (
                          <Avatar key={m.id} className="h-6 w-6 border-2 border-card">
                            <AvatarFallback className="text-[9px] bg-muted">{initials(m.profiles?.full_name ?? null)}</AvatarFallback>
                          </Avatar>
                        ))}
                        {p.members.length > 4 && (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground border-2 border-card">
                            +{p.members.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
