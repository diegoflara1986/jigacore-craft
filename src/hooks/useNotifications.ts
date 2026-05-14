import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  tarea_asignada: { icon: "📋", color: "text-blue-500" },
  story_assigned: { icon: "📋", color: "text-blue-500" },
  mencion: { icon: "💬", color: "text-purple-500" },
  cambio_estado: { icon: "🔄", color: "text-muted-foreground" },
  story_status_changed: { icon: "🔄", color: "text-blue-400" },
  story_blocked: { icon: "🔒", color: "text-destructive" },
  sprint_iniciado: { icon: "🚀", color: "text-green-500" },
  sprint_started: { icon: "🚀", color: "text-green-500" },
  sprint_completado: { icon: "✅", color: "text-green-700" },
  sprint_completed: { icon: "✅", color: "text-green-700" },
  tarea_vencida: { icon: "⏰", color: "text-destructive" },
  time_approved: { icon: "⏱️", color: "text-green-600" },
  nuevo_incidente: { icon: "🐛", color: "text-orange-500" },
  presupuesto_alerta: { icon: "💰", color: "text-yellow-500" },
  planning_poker: { icon: "🃏", color: "text-blue-400" },
  estimation_invite: { icon: "📊", color: "text-primary" },
  project_added: { icon: "👥", color: "text-primary" },
  project_removed: { icon: "👤", color: "text-muted-foreground" },
  info: { icon: "ℹ️", color: "text-muted-foreground" },
};

export function getNotificationConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.info;
}

export function useNotifications(limit?: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id, limit],
    queryFn: async () => {
      let q = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!user?.id,
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.id,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllAsRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          const cfg = getNotificationConfig(n.type);
          toast({
            title: `${cfg.icon} ${n.title}`,
            description: n.message || undefined,
            duration: 5000,
          });
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);
}
