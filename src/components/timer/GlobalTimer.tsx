import { useState } from "react";
import { Clock, Play, Square, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useTimer } from "@/hooks/useTimer";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/lib/auth";
import { useCreateTimeLog } from "@/hooks/useTimeLogs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function GlobalTimer() {
  const timer = useTimer();
  const { profile } = useAuth();
  const { data: projects } = useProjects();
  const createLog = useCreateTimeLog();

  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [storyId, setStoryId] = useState("");
  const [description, setDescription] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [stoppedData, setStoppedData] = useState<{ elapsed: number; projectId: string; storyId: string | null; description: string } | null>(null);

  const { data: stories } = useQuery({
    queryKey: ["timer-stories", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await supabase.from("user_stories").select("id, title, story_number").eq("project_id", projectId).is("deleted_at", null).order("story_number");
      return data ?? [];
    },
    enabled: !!projectId,
  });

  const handleStart = () => {
    if (!projectId) return;
    const proj = projects?.find(p => p.id === projectId);
    const story = stories?.find(s => s.id === storyId);
    timer.startTimer({
      projectId,
      projectName: proj?.name ?? "",
      storyId: storyId || undefined,
      storyLabel: story ? `HU-${story.story_number}: ${story.title}` : undefined,
      description,
    });
    setOpen(false);
  };

  const handleStop = () => {
    const result = timer.stopTimer();
    if (result) {
      setStoppedData(result);
      setShowConfirm(true);
    }
  };

  const handleSave = async () => {
    if (!stoppedData || !profile) return;
    const hours = Math.round((stoppedData.elapsed / 3600) * 100) / 100;
    await createLog.mutateAsync({
      user_id: profile.id,
      project_id: stoppedData.projectId,
      hours: Math.max(hours, 0.01),
      log_date: new Date().toISOString().split("T")[0],
      description: stoppedData.description || undefined,
      user_story_id: stoppedData.storyId || undefined,
    });
    timer.discardTimer();
    setShowConfirm(false);
    setStoppedData(null);
  };

  const handleDiscard = () => {
    timer.discardTimer();
    setShowConfirm(false);
    setStoppedData(null);
  };

  return (
    <>
      {timer.isRunning ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-success/10 text-success px-2.5 py-1 rounded-full text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            {formatTime(timer.elapsed)}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline max-w-32 truncate">{timer.projectName}</span>
          <Button variant="ghost" size="icon" onClick={handleStop} className="h-7 w-7 text-destructive hover:text-destructive">
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Clock className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Iniciar Timer</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Proyecto</Label>
                <Select value={projectId} onValueChange={(v) => { setProjectId(v); setStoryId(""); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
                  <SelectContent>
                    {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Historia de Usuario (opcional)</Label>
                <Select value={storyId} onValueChange={setStoryId} disabled={!projectId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar HU" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna</SelectItem>
                    {stories?.map(s => <SelectItem key={s.id} value={s.id}>HU-{s.story_number}: {s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <Input className="h-8 text-xs" placeholder="¿En qué estás trabajando?" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <Button className="w-full h-8" onClick={handleStart} disabled={!projectId}>
                <Play className="h-3.5 w-3.5 mr-1" />Iniciar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar tiempo registrado</DialogTitle>
            <DialogDescription>Revisa el resumen antes de guardar.</DialogDescription>
          </DialogHeader>
          {stoppedData && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Tiempo:</span>
                <span className="font-medium">{formatTime(stoppedData.elapsed)} ({(stoppedData.elapsed / 3600).toFixed(2)}h)</span>
                <span className="text-muted-foreground">Proyecto:</span>
                <span className="font-medium">{timer.projectName}</span>
                {timer.storyLabel && <>
                  <span className="text-muted-foreground">HU:</span>
                  <span className="font-medium">{timer.storyLabel}</span>
                </>}
                {stoppedData.description && <>
                  <span className="text-muted-foreground">Descripción:</span>
                  <span className="font-medium">{stoppedData.description}</span>
                </>}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleDiscard}><X className="h-4 w-4 mr-1" />Descartar</Button>
            <Button onClick={handleSave} disabled={createLog.isPending}><Check className="h-4 w-4 mr-1" />Guardar tiempo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
