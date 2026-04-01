import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban, CheckCircle2, Clock, ListTodo,
  Bell
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export default function Dashboard() {
  const { profile } = useAuth();

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
    queryKey: ["recent-projects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting()}, {profile?.full_name?.split(" ")[0] || "Usuario"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Aquí tienes un resumen de tu trabajo</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Proyectos Activos" value={projects ?? 0} icon={FolderKanban} color="bg-primary/10 text-primary" />
        <MetricCard title="Mis Tareas en Sprint" value={myTasks?.length ?? 0} icon={ListTodo} color="bg-accent/10 text-accent" />
        <MetricCard title="Completadas Hoy" value={0} icon={CheckCircle2} color="bg-success/10 text-success" />
        <MetricCard title="Horas Esta Semana" value="0h" icon={Clock} color="bg-info/10 text-info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Mis Tareas Pendientes</CardTitle>
          </CardHeader>
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
                      <Badge className={priorityColors[task.priority] || "bg-muted text-muted-foreground"} variant="secondary">
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(task.due_date).toLocaleDateString("es")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notificaciones
            </CardTitle>
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

      {/* Recent Projects */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Proyectos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentProjects?.length ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Aún no hay proyectos creados</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.map((p: any) => (
                <div key={p.id} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{p.client_name || "Sin cliente"}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{p.status}</Badge>
                  </div>
                  <div className="mt-3 w-full bg-muted rounded-full h-1.5">
                    <div className="bg-accent h-1.5 rounded-full" style={{ width: "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
