import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, Loader2 } from "lucide-react";
import { Project, useUpdateProject } from "@/hooks/useProjects";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
}

export function ArchiveProjectDialog({ open, onOpenChange, project }: Props) {
  const updateProject = useUpdateProject();
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    setLoading(true);
    try {
      await updateProject.mutateAsync({ id: project.id, status: "archived" });
      toast({ title: "Proyecto archivado correctamente" });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Archive className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle>¿Archivar este proyecto?</DialogTitle>
              <DialogDescription className="mt-1">
                El proyecto "{project.name}" será archivado. Podrás restaurarlo después desde la vista de proyectos archivados.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button variant="secondary" onClick={handleArchive} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Archivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
