import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Save, Upload, AlertTriangle } from "lucide-react";

const CURRENCIES = [
  { value: "COP", label: "COP - Peso Colombiano" },
  { value: "USD", label: "USD - Dólar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "MXN", label: "MXN - Peso Mexicano" },
];

const TIMEZONES = [
  "America/Bogota", "America/Mexico_City", "America/New_York", "America/Chicago",
  "America/Los_Angeles", "America/Sao_Paulo", "Europe/London", "Europe/Madrid", "UTC",
];

export function SettingsWorkspace() {
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: workspace } = useQuery({
    queryKey: ["workspace-settings"],
    queryFn: async () => {
      const { data: wsId } = await supabase.rpc("get_user_workspace_id");
      if (!wsId) return null;
      const { data, error } = await supabase.from("workspaces").select("*").eq("id", wsId).single();
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [tz, setTz] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (workspace) {
      setName(workspace.name ?? "");
      setCurrency(workspace.currency ?? "USD");
      setTz(workspace.timezone ?? "UTC");
    }
  }, [workspace]);

  const saveWorkspace = async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("workspaces").update({
        name, currency, timezone: tz,
      }).eq("id", workspace.id);
      if (error) throw error;
      toast({ title: "Configuración guardada" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold text-foreground">General del Workspace</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">Información del Workspace</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Nombre de la empresa</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Moneda predeterminada</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Zona horaria</Label>
            <Select value={tz} onValueChange={setTz}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveWorkspace} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Guardando..." : "Guardar configuración"}
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader className="bg-destructive/5 rounded-t-lg">
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Zona de Peligro
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Eliminar el workspace borrará todos los proyectos, datos y configuración de forma permanente.
          </p>
          <Button variant="destructive" onClick={() => setShowDelete(true)}>Eliminar Workspace</Button>
        </CardContent>
      </Card>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Eliminar workspace?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Escribe <strong>{workspace?.name}</strong> para confirmar la eliminación.
          </p>
          <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="Nombre del workspace" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteConfirm !== workspace?.name}
              onClick={() => toast({ title: "Contacta a soporte para eliminar el workspace", variant: "destructive" })}>
              Eliminar permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
