import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, workspace_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || !["admin", "super_admin"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Solo administradores pueden gestionar usuarios" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ========== UPDATE USER ==========
    if (action === "update") {
      const { user_id, role, full_name, password } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id es requerido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ensure target is in same workspace
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("workspace_id")
        .eq("id", user_id)
        .single();

      if (!targetProfile || targetProfile.workspace_id !== callerProfile.workspace_id) {
        return new Response(JSON.stringify({ error: "Usuario no pertenece a tu workspace" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update auth password if provided
      if (password && password.length > 0) {
        if (password.length < 6) {
          return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error: pwError } = await adminClient.auth.admin.updateUserById(user_id, { password });
        if (pwError) {
          return new Response(JSON.stringify({ error: pwError.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update profile fields
      const updates: Record<string, unknown> = {};
      if (role) updates.role = role;
      if (full_name !== undefined) updates.full_name = full_name || null;

      if (Object.keys(updates).length > 0) {
        await adminClient.from("profiles").update(updates).eq("id", user_id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CREATE USER ==========
    const { email, password, role, full_name } = body;

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: "Email, contraseña y rol son requeridos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new user — if email exists Supabase will return error
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });

    if (createError) {
      // Friendly message for duplicate email
      if (createError.message.includes("already been registered")) {
        return new Response(JSON.stringify({ error: "Ya existe un usuario registrado con este correo electrónico" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await adminClient
      .from("profiles")
      .update({
        role,
        workspace_id: callerProfile.workspace_id,
        full_name: full_name || null,
      })
      .eq("id", newUser.user.id);

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
