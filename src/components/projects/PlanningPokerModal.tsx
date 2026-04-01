import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useCreateEstimationSession } from "@/hooks/useEstimationSessions";
import { useUserStories } from "@/hooks/useUserStories";
import { useEpics } from "@/hooks/useEpics";
import { supabase } from "@/integrations/supabase/client";

const fromTable = (table: string) => (supabase as any).from(table);
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { data: epics } = useEpics(projectId);

  const [name, setName] = useState("Planning Poker");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);

  // Stories without story points
  const unestimatedStories = useMemo(
    () => stories?.filter((s) => s.story_points === null || s.story_points === 0) ?? [],
    [stories]
  );

  // Filter by epic or show all
  const filteredStories = useMemo(() => {
    if (filterMode === "all") return unestimatedStories;
    return unestimatedStories.filter((s) => s.epic_id === filterMode);
  }, [unestimatedStories, filterMode]);

  const toggleStory = (id: string) => {
    setSelectedStoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedStoryIds(filteredStories.map((s) => s.id));
  };

  const deselectAll = () => {
    setSelectedStoryIds([]);
  };

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

      onOpenChange(false);
      navigate(`/proyectos/${projectId}/planning-poker/${session.id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // Epics that have unestimated stories
  const epicsWithStories = useMemo(() => {
    if (!epics) return [];
    return epics.filter((e) =>
      unestimatedStories.some((s) => s.epic_id === e.id)
    );
  }, [epics, unestimatedStories]);

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
            <Label>Backlog / HU a estimar</Label>
            <Select value={filterMode} onValueChange={(v) => { setFilterMode(v); setSelectedStoryIds([]); }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar filtro" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Backlog completo ({unestimatedStories.length} HU sin estimar)</SelectItem>
                {epicsWithStories.map((e) => {
                  const count = unestimatedStories.filter((s) => s.epic_id === e.id).length;
                  return (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: e.color || undefined }} />
                        {e.title} ({count} HU)
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Escala de votación</Label>
            <p className="text-sm text-muted-foreground">Fibonacci (0, 1, 2, 3, 5, 8, 13, 21, 34, ?, ☕)</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Historias a estimar</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selectedStoryIds.length} seleccionadas</span>
                {filteredStories.length > 0 && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectedStoryIds.length === filteredStories.length ? deselectAll : selectAll}>
                    {selectedStoryIds.length === filteredStories.length ? "Deseleccionar" : "Seleccionar"} todas
                  </Button>
                )}
              </div>
            </div>
            <div className="border border-border rounded-lg max-h-52 overflow-y-auto divide-y divide-border">
              {filteredStories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay historias sin estimar</p>
              ) : (
                filteredStories.map((s) => (
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
