import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/hooks/useIncidents";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";

const fromTable = (table: string) => (supabase as any).from(table);

export function IncidentCreateModal({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<"info" | "files">("info");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    project_id: "", title: "", category: "", description: "",
    steps_to_reproduce: "", expected_result: "", actual_result: "",
  });

  const { data: myProjects } = useQuery({
    queryKey: ["my-projects-for-incidents", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships } = await supabase.from("project_members").select("project_id").eq("user_id", user.id);
      const ids = (memberships ?? []).map(m => m.project_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("projects").select("id, name").eq("status", "active").in("id", ids).order("name");
      return data ?? [];
    },
    enabled: !!user && open,
  });

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => f.size <= 50 * 1024 * 1024);
    setFiles(prev => [...prev, ...valid].slice(0, 10));
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    if (!form.title.trim() || !form.project_id || !form.description.trim() || !form.category) {
      toast({ title: "Completa todos los campos requeridos", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("incidents").insert({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        project_id: form.project_id,
        steps_to_reproduce: form.steps_to_reproduce || null,
        expected_result: form.expected_result || null,
        actual_result: form.actual_result || null,
        status: "pendiente",
        created_by: user?.id,
      } as any).select("id, ticket_code").single();
      if (error) throw error;

      // Upload files
      if (files.length > 0 && data.ticket_code) {
        for (const file of files) {
          const path = `${data.ticket_code}/${file.name}`;
          const { error: upErr } = await supabase.storage.from("incident-attachments").upload(path, file);
          if (!upErr) {
            const { data: urlData } = supabase.storage.from("incident-attachments").getPublicUrl(path);
            await fromTable("incident_attachments").insert({
              incident_id: data.id,
              file_name: file.name,
              file_url: urlData.publicUrl,
              file_type: file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : "document",
              file_size: file.size,
              uploaded_by: user?.id,
            });
          }
        }
      }

      // Notify managers
      const { data: managePerms } = await fromTable("role_permissions")
        .select("role_id")
        .eq("module", "incidentes")
        .eq("action", "gestionar")
        .eq("is_allowed", true);
      const manageRoleIds = (managePerms ?? []).map((p: any) => p.role_id);
      const { data: projectMembers } = await supabase.from("project_members").select("user_id, profiles:profiles(role_id)").eq("project_id", form.project_id);
      const notifyIds = (projectMembers ?? [])
        .filter((m: any) => m.profiles && manageRoleIds.includes(m.profiles.role_id) && m.user_id !== user?.id)
        .map((m: any) => m.user_id);

      for (const uid of notifyIds) {
        await supabase.from("notifications").insert({
          user_id: uid,
          title: "🔴 Nuevo incidente reportado",
          message: `${form.title} | Ticket: ${data.ticket_code}`,
          type: "incident",
          reference_id: data.id,
          reference_type: "incident",
        });
      }

      toast({ title: `Incidente ${data.ticket_code} creado` });
      qc.invalidateQueries({ queryKey: ["incidents"] });
      qc.invalidateQueries({ queryKey: ["incident-stats"] });
      setForm({ project_id: "", title: "", category: "", description: "", steps_to_reproduce: "", expected_result: "", actual_result: "" });
      setFiles([]);
      setStep("info");
      onCreated(data.id);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setStep("info"); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Reportar Incidente</DialogTitle></DialogHeader>

        <Tabs value={step} onValueChange={v => setStep(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">① Información</TabsTrigger>
            <TabsTrigger value="files" className="flex-1">② Adjuntos ({files.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Proyecto *</Label>
              <Select value={form.project_id} onValueChange={v => set("project_id", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
                <SelectContent>
                  {(myProjects ?? []).length === 0 ? (
                    <SelectItem value="_none" disabled>No tienes proyectos asignados</SelectItem>
                  ) : (myProjects ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Descripción breve del incidente" maxLength={150} />
            </div>
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción detallada *</Label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={4} placeholder="Describe el problema con el mayor detalle posible" />
            </div>
            <div className="space-y-2">
              <Label>Pasos para reproducir</Label>
              <Textarea value={form.steps_to_reproduce} onChange={e => set("steps_to_reproduce", e.target.value)} rows={3} placeholder="1. Ir a la pantalla X&#10;2. Hacer clic en Y" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resultado esperado</Label>
                <Textarea value={form.expected_result} onChange={e => set("expected_result", e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Resultado actual</Label>
                <Textarea value={form.actual_result} onChange={e => set("actual_result", e.target.value)} rows={2} />
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep("files")}>Siguiente: Adjuntos →</Button>
          </TabsContent>

          <TabsContent value="files" className="space-y-4 mt-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Arrastra archivos o haz clic para seleccionar</p>
              <p className="text-xs text-muted-foreground">Imágenes, documentos PDF/DOC/XLSX, videos MP4 (máx 50MB, hasta 10 archivos)</p>
              <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.xlsx,.mp4" style={{ position: "relative" }} />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 border rounded-lg">
                    {f.type.startsWith("image") ? <ImageIcon className="h-4 w-4 text-blue-500" /> : <FileText className="h-4 w-4 text-orange-500" />}
                    <span className="text-sm flex-1 truncate">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creando..." : "Crear Incidente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
