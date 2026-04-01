import { useState } from "react";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, getNotificationConfig } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

export default function Notifications() {
  const { data: all } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markRead = useMarkAsRead();
  const markAll = useMarkAllAsRead();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = filter === "unread" ? all?.filter(n => !n.is_read) : all;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
        <div className="flex gap-2">
          {unreadCount && unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
              <CheckCheck className="h-4 w-4 mr-1" /> Marcar todas como leídas
            </Button>
          )}
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Todas ({all?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="unread">No leídas ({unreadCount ?? 0})</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-2">
        {(!filtered || filtered.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Sin notificaciones
            </CardContent>
          </Card>
        )}
        {filtered?.map((n) => {
          const cfg = getNotificationConfig(n.type);
          return (
            <Card
              key={n.id}
              className={cn(
                "cursor-pointer hover:shadow-md transition-shadow",
                !n.is_read && "border-l-4 border-l-primary bg-blue-50/50 dark:bg-blue-950/10"
              )}
              onClick={() => { if (!n.is_read) markRead.mutate(n.id); }}
            >
              <CardContent className="py-4 flex items-start gap-3">
                <span className="text-xl mt-0.5">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <span className="h-2.5 w-2.5 rounded-full bg-primary mt-2 shrink-0" />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
