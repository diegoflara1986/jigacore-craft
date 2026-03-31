import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useCreateEstimationSession } from "@/hooks/useEstimationSessions";
import { useUserStories } from "@/hooks/useUserStories";
import { useSprints } from "@/hooks/useSprints";
import { supabase } from "@/integrations/supabase/client";

const fromTable = (table: string) => (supabase as any).from(table);
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  const { user } = useAuth();
  const createSession = useCreateEstimationSession();
  const { data: stories } = useUserStories(projectId);
  const { data: sprints } = useSprints(projectId);

  const [name, setName] = useState("Planning Poker");
  const [sprintId, setSprintId] = useState<string>("none");
  const [scaleType, setScaleType] = useState("fibonacci");
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);

  // Stories without story points
  const unestimatedStories = useMemo(
    () => stories?.filter((s) => s.story_points === null || s.story_points === 0) ?? [],
    [stories]
  );

  const toggleStory = (id: string) => {
    setSelectedStoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || !selectedStoryIds.length || !user) return;

    try {
      const session = await createSession.mutateAsync({
        project_id: projectId,
        sprint_id: sprintId === "none" ? null : sprintId,
        name,
        scale_type: scaleType,
        status: "active",
        current_story_id: selectedStoryIds[0],
        created_by: user.id,
      });

      // Create estimations for each selected story
      for (const storyId of selectedStoryIds) {
        await supabase.from("estimations").insert({
          project_id: projectId,
          user_story_id: storyId,
          session_id: session.id,
          scale_type: scaleType,
          created_by: user.id,
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
            <Label>Sprint</Label>
            <Select value={sprintId} onValueChange={setSprintId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar sprint" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin sprint</SelectItem>
                {sprints?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Escala de votación</Label>
            <RadioGroup value={scaleType} onValueChange={setScaleType} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fibonacci" id="fibonacci" />
                <Label htmlFor="fibonacci" className="text-sm font-normal cursor-pointer">
                  Fibonacci (0, 1, 2, 3, 5, 8, 13, 21, 34, ?, ☕)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tshirt" id="tshirt" />
                <Label htmlFor="tshirt" className="text-sm font-normal cursor-pointer">
                  T-Shirt (XS, S, M, L, XL, XXL, ?, ☕)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Historias a estimar</Label>
              <span className="text-xs text-muted-foreground">{selectedStoryIds.length} seleccionadas</span>
            </div>
            <div className="border border-border rounded-lg max-h-52 overflow-y-auto divide-y divide-border">
              {unestimatedStories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay historias sin estimar</p>
              ) : (
                unestimatedStories.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={selectedStoryIds.includes(s.id)}
                      onCheckedChange={() => toggleStory(s.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">{s.title}</span>
                      <div className="flex gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[9px]">{PRIORITIES[s.priority] ?? s.priority}</Badge>
                        {s.epics && (
                          <Badge variant="outline" className="text-[9px]" style={{ borderColor: s.epics.color || undefined }}>
                            {s.epics.title}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || !selectedStoryIds.length || createSession.isPending}>
            Crear sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
