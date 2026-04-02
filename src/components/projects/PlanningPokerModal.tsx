import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useCreateEstimationSession } from "@/hooks/useEstimationSessions";
import { useUserStories } from "@/hooks/useUserStories";
import { useProjectMembers, useProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";

const fromTable = (table: string) => (supabase as any).from(table);
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

const PRIORITIES: Record<string, string> = {
  critical: "Crítica", high: "Alta", medium: "Media", low: "Baja",
};

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanningPokerModal({ projectId, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const createSession = useCreateEstimationSession();
  const { data: stories } = useUserStories(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: project } = useProject(projectId);

  const [name, setName] = useState("Planning Poker");
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const unestimatedStories = useMemo(
    () => stories?.filter((s) => (s.story_points === null || s.story_points === 0) && !s.deleted_at) ?? [],
    [stories]
  );

  const toggleStory = (id: string) => setSelectedStoryIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleMember = (id: string) => setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const selectAllStories = () => setSelectedStoryIds(unestimatedStories.map((s) => s.id));
  const deselectAllStories = () => setSelectedStoryIds([]);
  const selectAllMembers = () => setSelectedMemberIds(members?.map((m) => m.user_id) ?? []);
  const deselectAllMembers = () => setSelectedMemberIds([]);

  const initials = (name: string | null) => name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  const handleCreate = async () => {
    if (!name.trim() || !selectedStoryIds.length || !user) return;

    try {
      const session = await createSession.mutateAsync({
        project_id: projectId,
        sprint_id: null,
        name,
        scale_type: "fibonacci",
        status: "active",
        current_story_id: selectedStoryIds[0],
        created_by: user.id,
      });

      // Create estimations for each selected story
      for (const storyId of selectedStoryIds) {
        await fromTable("estimations").insert({
          project_id: projectId,
          user_story_id: storyId,
          session_id: session.id,
          scale_type: "fibonacci",
          created_by: user.id,
        });
      }

      // Save participants
      for (const memberId of selectedMemberIds) {
        await fromTable("estimation_session_participants").insert({
          session_id: session.id,
          user_id: memberId,
        });
      }

      // Also add the creator as participant
      if (!selectedMemberIds.includes(user.id)) {
        await fromTable("estimation_session_participants").insert({
          session_id: session.id,
          user_id: user.id,
        });
      }

      // Send notifications to invited participants (except creator)
      const moderatorName = profile?.full_name || profile?.email || "Alguien";
      const projectName = project?.name || "un proyecto";
      const invitees = selectedMemberIds.filter((id) => id !== user.id);
      for (const memberId of invitees) {
        await supabase.from("notifications").insert({
          user_id: memberId,
          type: "planning_poker_invite",
          title: "Te invitaron a Planning Poker 🃏",
          message: `${moderatorName} te invitó a la sesión '${name}' del proyecto '${projectName}'`,
          reference_id: session.id,
          reference_type: "estimation_session",
        });
      }

      onOpenChange(false);
      navigate(`/proyectos/${projectId}/planning-poker/${session.id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Sesión de Planning Poker</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre de la sesión</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Planning Sprint 4" />
          </div>

          <div className="space-y-2">
            <Label>Escala de votación</Label>
            <p className="text-sm text-muted-foreground">Fibonacci (0, 1, 2, 3, 5, 8, 13, 21, 34, ?, ☕)</p>
          </div>

          {/* Stories selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Historias a estimar</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selectedStoryIds.length} seleccionadas</span>
                {unestimatedStories.length > 0 && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectedStoryIds.length === unestimatedStories.length ? deselectAllStories : selectAllStories}>
                    {selectedStoryIds.length === unestimatedStories.length ? "Deseleccionar" : "Seleccionar"} todas
                  </Button>
                )}
              </div>
            </div>
            <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
              {unestimatedStories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay historias sin estimar</p>
              ) : (
                unestimatedStories.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedStoryIds.includes(s.id)} onCheckedChange={() => toggleStory(s.id)} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">{s.title}</span>
                      <Badge variant="outline" className="text-[9px]">{PRIORITIES[s.priority] ?? s.priority}</Badge>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Participants selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Participantes</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selectedMemberIds.length} seleccionados</span>
                {(members?.length ?? 0) > 0 && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectedMemberIds.length === (members?.length ?? 0) ? deselectAllMembers : selectAllMembers}>
                    {selectedMemberIds.length === (members?.length ?? 0) ? "Deseleccionar" : "Seleccionar"} todos
                  </Button>
                )}
              </div>
            </div>
            <div className="border border-border rounded-lg max-h-40 overflow-y-auto divide-y divide-border">
              {!members?.length ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay miembros en el proyecto</p>
              ) : (
                members.map((m) => (
                  <label key={m.user_id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedMemberIds.includes(m.user_id)} onCheckedChange={() => toggleMember(m.user_id)} />
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[9px] bg-muted">{initials(m.profiles?.full_name ?? null)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">{m.profiles?.full_name || m.profiles?.email}</span>
                      <span className="text-[10px] text-muted-foreground">{m.project_role}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || !selectedStoryIds.length || !selectedMemberIds.length || createSession.isPending}>
            Crear sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
