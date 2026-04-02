import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, getNotificationConfig } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

export function NotificationDropdown() {
  const { data: notifications } = useNotifications(10);
  const { data: unread } = useUnreadCount();
  const markRead = useMarkAsRead();
  const markAll = useMarkAllAsRead();
  const navigate = useNavigate();

  const handleClick = async (n: any) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.reference_type === "estimation_round" && n.reference_id) {
      // Look up the round's project_id to navigate to estimation tab
      const { data } = await (supabase as any).from("estimation_rounds").select("project_id").eq("id", n.reference_id).maybeSingle();
      if (data?.project_id) {
        navigate(`/proyectos/${data.project_id}?tab=estimation`);
      } else {
        navigate(`/my-work`);
      }
    } else if (n.reference_type === "project" && n.reference_id) navigate(`/proyectos/${n.reference_id}`);
    else if (n.reference_type === "incident" && n.reference_id) navigate(`/incidents`);
    else if (n.reference_type === "user_story" && n.reference_id) navigate(`/my-work`);
    else if (n.reference_type === "sprint") navigate(`/reports`);
  };

  const badgeText = unread && unread > 0 ? (unread > 99 ? "99+" : String(unread)) : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="h-4 w-4" />
          {badgeText && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {badgeText}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unread && unread > 0 ? (
            <button onClick={() => markAll.mutate()} className="text-xs text-primary hover:underline">
              Marcar todas como leídas
            </button>
          ) : null}
        </div>
        <ScrollArea className="max-h-[400px]">
          {(!notifications || notifications.length === 0) && (
            <p className="text-center text-muted-foreground text-sm py-8">Sin notificaciones</p>
          )}
          {notifications?.map((n) => {
            const cfg = getNotificationConfig(n.type);
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0",
                  !n.is_read && "bg-blue-50 dark:bg-blue-950/20"
                )}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                  <span className="text-lg shrink-0">{cfg.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    {n.message && <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </ScrollArea>
        <div className="border-t border-border px-4 py-2">
          <button onClick={() => navigate("/notificaciones")} className="text-xs text-primary hover:underline w-full text-center">
            Ver todas
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
