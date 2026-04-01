import { useState } from "react";
import { Hexagon, Search, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const STATUS_COLORS: Record<string, string> = {
  nuevo: "bg-gray-200 text-gray-800",
  asignado: "bg-blue-100 text-blue-800",
  "en revisión": "bg-yellow-100 text-yellow-800",
  "en revision": "bg-yellow-100 text-yellow-800",
  "en desarrollo": "bg-orange-100 text-orange-800",
  "en qa": "bg-purple-100 text-purple-800",
  resuelto: "bg-green-100 text-green-800",
  cerrado: "bg-gray-400 text-white",
};

interface PublicIncident {
  ticket_code: string;
  title: string;
  status: string;
  severity: string;
  created_at: string;
  updated_at: string | null;
}

export default function LookupIncident() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicIncident | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  const lookup = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    setAttachments([]);
    try {
      const { data, error } = await supabase.rpc("lookup_incident_public", { p_ticket_code: code.trim().toUpperCase() });
      if (error) throw error;
      if (data && data.length > 0) {
        const incident = data[0] as PublicIncident;
        setResult(incident);

        // Attachments are only viewable by authenticated team members
        // Anonymous lookup only shows incident status
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <header className="w-full border-b py-4 flex justify-center items-center gap-2">
        <Hexagon className="h-7 w-7 text-primary" />
        <span className="text-lg font-bold">Jigacore PM</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg w-full">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Consultar estado de tu reporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ingresa tu código de ticket (ej: INC-2025-001)"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && lookup()}
                aria-label="Código de ticket"
              />
              <Button onClick={lookup} disabled={loading} aria-label="Buscar incidente">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {notFound && (
              <p className="text-sm text-red-500 text-center">No encontramos un ticket con ese código</p>
            )}

            {result && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-lg">{result.ticket_code}</span>
                  <Badge className={STATUS_COLORS[result.status] || "bg-gray-200"}>{result.status}</Badge>
                </div>
                <p className="font-medium text-gray-900">{result.title}</p>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Severidad:</span>{" "}
                    <Badge variant="outline">{result.severity}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Creado:</span>{" "}
                    {new Date(result.created_at).toLocaleDateString("es")}
                  </div>
                  {result.updated_at && (
                    <div className="col-span-2">
                      <span className="font-medium">Última actualización:</span>{" "}
                      {new Date(result.updated_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>

                {/* Attachments with signed URLs */}
                {attachments.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <ImageIcon className="h-4 w-4" /> Adjuntos ({attachments.length})
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {attachments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all">
                          <img src={url} alt={`Adjunto ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-center pt-2">
              <Link to="/reportar-incidente" className="text-sm text-primary hover:underline">
                ¿Quieres reportar un nuevo incidente?
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
