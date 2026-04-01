import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate required fields server-side
    const { project_id, title, description, reported_by_email, reporter_name, severity, category,
      steps_to_reproduce, expected_result, actual_result, version, browser_info } = body;

    if (!project_id || typeof project_id !== "string") {
      return new Response(JSON.stringify({ error: "project_id es requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!title || typeof title !== "string" || title.trim().length === 0 || title.length > 150) {
      return new Response(JSON.stringify({ error: "title es requerido (máx 150 caracteres)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!description || typeof description !== "string" || description.trim().length < 50) {
      return new Response(JSON.stringify({ error: "description debe tener al menos 50 caracteres" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!reported_by_email || typeof reported_by_email !== "string" || !/\S+@\S+\.\S+/.test(reported_by_email)) {
      return new Response(JSON.stringify({ error: "Email de contacto inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!reporter_name || typeof reporter_name !== "string" || reporter_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Nombre es requerido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!category || typeof category !== "string") {
      return new Response(JSON.stringify({ error: "Categoría es requerida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validSeverities = ["critica", "alta", "media", "baja"];
    if (!severity || !validSeverities.includes(severity)) {
      return new Response(JSON.stringify({ error: "Severidad inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate project exists and is active
    const { data: project, error: projError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .eq("status", "active")
      .single();

    if (projError || !project) {
      return new Response(JSON.stringify({ error: "Proyecto no encontrado o no activo" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sanitize text fields
    const sanitize = (val: unknown): string | null => {
      if (!val || typeof val !== "string") return null;
      return val.trim().slice(0, 2000);
    };

    const { data, error } = await supabaseAdmin.from("incidents").insert({
      project_id,
      title: title.trim().slice(0, 150),
      description: description.trim().slice(0, 5000),
      steps_to_reproduce: sanitize(steps_to_reproduce),
      expected_result: sanitize(expected_result),
      actual_result: sanitize(actual_result),
      severity,
      category: category.trim().slice(0, 100),
      status: "nuevo",
      reported_by_email: reported_by_email.trim().slice(0, 255),
      reporter_name: (reporter_name as string).trim().slice(0, 100),
      version: sanitize(version),
      browser_info: sanitize(browser_info),
    }).select("ticket_code").single();

    if (error) {
      return new Response(JSON.stringify({ error: "Error al crear el incidente" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ticket_code: data.ticket_code }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
