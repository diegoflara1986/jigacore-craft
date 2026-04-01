import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { Project } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
}

export function DuplicateProjectDialog({ open, onOpenChange, project }: Props) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(`Copia de ${project.name}`);
  const [copyEpics, setCopyEpics] = useState(true);
  const [copyStories, setCopyStories] = useState(true);
  const [copyMembers, setCopyMembers] = useState(true);
  const [loading, setLoading] = useState(false);

  // Reset name when project changes
  useState(() => {
    setName(`Copia de ${project.name}`);
  });

  const handleDuplicate = async () => {
    if (!name.trim() || !profile) return;
    setLoading(true);
    try {
      // Get workspace
      const { data: wsId } = await supabase.rpc("ensure_user_workspace");

      // Create project
      const { data: newProject, error } = await supabase.from("projects").insert({
        name: name.trim(),
        description: project.description,
        client_name: project.client_name,
        status: "active",
        start_date: project.start_date,
        end_date: project.end_date,
        budget: project.budget,
        currency: project.currency,
        color: project.color,
        git_url: project.git_url,
        technologies: project.technologies,
        workspace_id: wsId,
        created_by: profile.id,
      }).select().single();
      if (error) throw error;

      // Copy members
      if (copyMembers) {
        const { data: members } = await supabase.from("project_members").select("user_id, project_role").eq("project_id", project.id);
        if (members?.length) {
          await supabase.from("project_members").insert(
            members.map(m => ({ project_id: newProject.id, user_id: m.user_id, project_role: m.project_role }))
          );
        }
      }

      // Copy epics and build mapping for stories
      const epicMap: Record<string, string> = {};
      if (copyEpics) {
        const { data: epics } = await supabase.from("epics").select("*").eq("project_id", project.id);
        if (epics?.length) {
          for (const epic of epics) {
            const { data: newEpic } = await supabase.from("epics").insert({
              project_id: newProject.id, title: epic.title, description: epic.description,
              color: epic.color, start_date: epic.start_date, end_date: epic.end_date,
            }).select().single();
            if (newEpic) epicMap[epic.id] = newEpic.id;
          }
        }
      }

      // Copy user stories from backlog
      if (copyStories) {
        const { data: stories } = await supabase.from("user_stories").select("*").eq("project_id", project.id).is("deleted_at", null);
        if (stories?.length) {
          for (const story of stories) {
            await supabase.from("user_stories").insert({
              project_id: newProject.id, title: story.title, description: story.description,
              acceptance_criteria: story.acceptance_criteria, priority: story.priority,
              type: story.type, status: "backlog",
              epic_id: story.epic_id && epicMap[story.epic_id] ? epicMap[story.epic_id] : null,
            });
          }
        }
      }

      qc.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Proyecto duplicado correctamente" });
      onOpenChange(false);
      navigate(`/proyectos/${newProject.id}`);
    } catch (e: any) {
      toast({ title: "Error al duplicar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicar Proyecto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre del nuevo proyecto</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="dup-epics" checked={copyEpics} onCheckedChange={v => setCopyEpics(v === true)} />
              <Label htmlFor="dup-epics" className="text-sm">Copiar épicas</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="dup-stories" checked={copyStories} onCheckedChange={v => setCopyStories(v === true)} />
              <Label htmlFor="dup-stories" className="text-sm">Copiar HU del backlog</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="dup-members" checked={copyMembers} onCheckedChange={v => setCopyMembers(v === true)} />
              <Label htmlFor="dup-members" className="text-sm">Copiar miembros del equipo</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleDuplicate} disabled={loading || !name.trim()} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Duplicar Proyecto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
