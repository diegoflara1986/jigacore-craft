import { useState, useCallback } from "react";
import { Hexagon, CheckCircle2, Upload, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const SEVERITY_OPTIONS = [
  { value: "critica", emoji: "🔴", label: "Crítica", desc: "El sistema no funciona o hay pérdida de datos", color: "border-red-500 bg-red-50" },
  { value: "alta", emoji: "🟠", label: "Alta", desc: "Funcionalidad importante afectada", color: "border-orange-500 bg-orange-50" },
  { value: "media", emoji: "🟡", label: "Media", desc: "Funcionalidad afectada con solución alternativa", color: "border-yellow-500 bg-yellow-50" },
  { value: "baja", emoji: "🟢", label: "Baja", desc: "Problema menor o estético", color: "border-green-500 bg-green-50" },
];

const CATEGORIES = ["Bug de sistema", "Error de interfaz", "Problema de rendimiento", "Error de datos", "Problema de seguridad", "Otro"];
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ReportIncident() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ticketCode: string; email: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const [form, setForm] = useState({
    project_id: "", reporter_name: "", reported_by_email: "", title: "", description: "",
    steps_to_reproduce: "", expected_result: "", actual_result: "",
    severity: "media", category: "", version: "", browser_info: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const { data: projects } = useQuery({
    queryKey: ["public-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_projects_public");
      if (error) throw error;
      return data ?? [];
    },
  });

  const set = (field: string, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(p => { const n = { ...p }; delete n[field]; return n; });
  };

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const errs: string[] = [];
    const valid: File[] = [];

    Array.from(newFiles).forEach(f => {
      if (!ALLOWED_TYPES.includes(f.type)) {
        errs.push(`"${f.name}" no es un tipo permitido. Solo JPG, PNG, GIF, WEBP.`);
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        errs.push(`"${f.name}" supera el límite de 10MB`);
        return;
      }
      valid.push(f);
    });

    setFileErrors(errs);
    const combined = [...files, ...valid].slice(0, 5);
    setFiles(combined);
    setPreviews(combined.map(f => URL.createObjectURL(f)));
  }, [files]);

  const removeFile = (idx: number) => {
    setFiles(p => p.filter((_, i) => i !== idx));
    setPreviews(p => p.filter((_, i) => i !== idx));
    setFileErrors([]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.project_id) e.project_id = "Selecciona un proyecto";
    if (!form.reporter_name.trim()) e.reporter_name = "Ingresa tu nombre";
    if (!form.reported_by_email.trim() || !/\S+@\S+\.\S+/.test(form.reported_by_email)) e.reported_by_email = "Ingresa un email válido";
    if (!form.title.trim()) e.title = "Ingresa un título";
    if (form.title.length > 150) e.title = "Máximo 150 caracteres";
    if (!form.description.trim() || form.description.trim().length < 50) e.description = "Mínimo 50 caracteres";
    if (!form.category) e.category = "Selecciona una categoría";
    if (!acceptTerms) e.terms = "Debes aceptar los términos";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Use edge function for public incident creation (no direct DB access)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-incident`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            project_id: form.project_id,
            title: form.title,
            description: form.description,
            steps_to_reproduce: form.steps_to_reproduce || null,
            expected_result: form.expected_result || null,
            actual_result: form.actual_result || null,
            severity: form.severity,
            category: form.category,
            reported_by_email: form.reported_by_email,
            reporter_name: form.reporter_name,
            version: form.version || null,
            browser_info: form.browser_info || null,
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Error al enviar");

      const ticketCode = result.ticket_code;

      // Note: File uploads removed for anonymous users (storage requires auth)
      // Files can be attached later by authenticated team members

      setSubmitted({ ticketCode, email: form.reported_by_email });
    } catch (err: any) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center">
        <header className="w-full border-b py-4 flex justify-center items-center gap-2">
          <Hexagon className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold">Jigacore PM</span>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg text-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">¡Reporte enviado exitosamente!</h1>
          <p className="text-gray-500 mt-2">Tu código de seguimiento es:</p>
          <div className="mt-4 px-8 py-4 bg-gray-100 rounded-xl border-2 border-gray-200">
            <span className="text-3xl font-mono font-bold text-gray-900">{submitted.ticketCode}</span>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Te notificaremos a <strong>{submitted.email}</strong> sobre el progreso
          </p>
          <div className="flex gap-3 mt-8">
            <Button onClick={() => navigate("/consultar-incidente")} className="bg-primary">Consultar estado de mi reporte</Button>
            <Button variant="outline" onClick={() => { setSubmitted(null); setForm({ project_id: "", reporter_name: "", reported_by_email: "", title: "", description: "", steps_to_reproduce: "", expected_result: "", actual_result: "", severity: "media", category: "", version: "", browser_info: "" }); setFiles([]); setPreviews([]); setAcceptTerms(false); setFileErrors([]); }}>
              Reportar otro incidente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="w-full border-b py-4 flex justify-center items-center gap-2">
        <Hexagon className="h-7 w-7 text-primary" />
        <span className="text-lg font-bold">Jigacore PM</span>
      </header>
      <div className="max-w-[700px] mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center">Reportar un Incidente</h1>
        <p className="text-gray-500 text-center mt-1 mb-8">Describe el problema y te contactaremos pronto</p>

        <div className="space-y-5">
          <Field label="Proyecto/Producto afectado" error={errors.project_id} required>
            <Select value={form.project_id} onValueChange={v => set("project_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona el producto afectado" /></SelectTrigger>
              <SelectContent>{projects?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Nombre completo" error={errors.reporter_name} required>
            <Input placeholder="Tu nombre completo" value={form.reporter_name} onChange={e => set("reporter_name", e.target.value)} />
          </Field>

          <Field label="Email de contacto" error={errors.reported_by_email} required>
            <Input type="email" placeholder="tu@email.com" value={form.reported_by_email} onChange={e => set("reported_by_email", e.target.value)} />
          </Field>

          <Field label="Título del incidente" error={errors.title} required>
            <Input placeholder="Resumen corto del problema" maxLength={150} value={form.title} onChange={e => set("title", e.target.value)} />
            <span className="text-xs text-gray-400">{form.title.length}/150</span>
          </Field>

          <Field label="Descripción detallada" error={errors.description} required>
            <Textarea placeholder="Describe el problema con el mayor detalle posible" value={form.description} onChange={e => set("description", e.target.value)} className="min-h-[120px]" />
            <span className="text-xs text-gray-400">{form.description.length} caracteres (mín. 50)</span>
          </Field>

          <Field label="Pasos para reproducir">
            <Textarea placeholder={"1. Ir a la pantalla X\n2. Hacer clic en Y\n3. El error aparece"} value={form.steps_to_reproduce} onChange={e => set("steps_to_reproduce", e.target.value)} />
          </Field>

          <Field label="Resultado esperado">
            <Textarea placeholder="¿Qué debería pasar normalmente?" value={form.expected_result} onChange={e => set("expected_result", e.target.value)} />
          </Field>

          <Field label="Resultado actual">
            <Textarea placeholder="¿Qué está pasando actualmente?" value={form.actual_result} onChange={e => set("actual_result", e.target.value)} />
          </Field>

          <Field label="Severidad" required>
            <div className="grid grid-cols-2 gap-3">
              {SEVERITY_OPTIONS.map(s => (
                <button key={s.value} type="button" onClick={() => set("severity", s.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${form.severity === s.value ? s.color + " ring-2 ring-offset-1" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
                  <div className="flex items-center gap-2 font-medium text-sm">{s.emoji} {s.label}</div>
                  <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Categoría" error={errors.category} required>
            <Select value={form.category} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>

          <Field label="Versión del producto">
            <Input placeholder="ej: v2.1.0" value={form.version} onChange={e => set("version", e.target.value)} />
          </Field>

          <Field label="Navegador y dispositivo">
            <Input placeholder="ej: Chrome 120 en Windows 11" value={form.browser_info} onChange={e => set("browser_info", e.target.value)} />
          </Field>

          {/* Capturas de pantalla */}
          <Field label="Capturas de pantalla">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Arrastra imágenes aquí o haz clic para seleccionar</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WEBP · Máx 5 imágenes · 10MB c/u</p>
              <input id="file-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
            </div>

            {/* File validation errors */}
            {fileErrors.length > 0 && (
              <div className="mt-2 space-y-1">
                {fileErrors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {previews.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {previews.map((p, i) => (
                  <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border">
                    <img src={p} alt={`Captura ${i + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeFile(i)} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5" aria-label="Eliminar imagen">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <div className="flex items-start gap-2">
            <Checkbox id="terms" checked={acceptTerms} onCheckedChange={v => setAcceptTerms(!!v)} className="mt-0.5" />
            <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
              Acepto que mi email sea usado para dar seguimiento a este reporte
            </label>
          </div>
          {errors.terms && <p className="text-sm text-red-500">{errors.terms}</p>}
          {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}

          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90">
            {submitting ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</span> : "Enviar Reporte"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
