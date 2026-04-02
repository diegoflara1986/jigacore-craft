import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useCreateEstimationRound } from "@/hooks/useEstimationRounds";
import { useUserStories } from "@/hooks/useUserStories";
import { useProjectMembers, useProject } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

const fromTable = (table: string) => (supabase as any).from(table);

const PRIORITIES: Record<string, string> = {
  critical: "Crítica", high: "Alta", medium: "Media", low: "Baja",
};

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEstimationRoundModal({ projectId, open, onOpenChange }: Props) {
  const { user, profile } = useAuth();
  const createRound = useCreateEstimationRound();
  const { data: stories } = useUserStories(projectId);
  const { data: members } = useProjectMembers(projectId);
  const { data: project } = useProject(projectId);

  const [title, setTitle] = useState("Estimación Sprint");
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
    if (!title.trim() || !selectedStoryIds.length || !user) return;

    try {
      const round = await createRound.mutateAsync({
        project_id: projectId,
        title,
        created_by: user.id,
      });

      // Create round_stories
      for (const storyId of selectedStoryIds) {
        await fromTable("estimation_round_stories").insert({
          round_id: round.id,
          user_story_id: storyId,
        });
      }

      // Save participants
      for (const memberId of selectedMemberIds) {
        await fromTable("estimation_round_participants").insert({
          round_id: round.id,
          user_id: memberId,
        });
      }

      // Also add the creator as participant if not selected
      if (!selectedMemberIds.includes(user.id)) {
        await fromTable("estimation_round_participants").insert({
          round_id: round.id,
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
          type: "estimation_invite",
          title: "📊 Nueva estimación pendiente",
          message: `${moderatorName} te invita a estimar ${selectedStoryIds.length} historias de usuario en '${projectName}'`,
          reference_id: round.id,
          reference_type: "estimation_round",
        });
      }

      onOpenChange(false);
      setTitle("Estimación Sprint");
      setSelectedStoryIds([]);
      setSelectedMemberIds([]);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Ronda de Estimación</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Título de la ronda</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Estimación Sprint 4" />
          </div>

          <div className="space-y-2">
            <Label>Escala de votación</Label>
            <p className="text-sm text-muted-foreground">Fibonacci: 0, 1, 2, 3, 5, 8, 13, 21, 34</p>
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
              <Label>Miembros que deben votar</Label>
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
          <Button onClick={handleCreate} disabled={!title.trim() || !selectedStoryIds.length || !selectedMemberIds.length || createRound.isPending}>
            Crear y Notificar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
