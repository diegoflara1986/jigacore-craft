import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id es requerido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("workspace_id")
        .eq("id", user_id)
        .single();

      if (!targetProfile || targetProfile.workspace_id !== callerProfile.workspace_id) {
        return new Response(JSON.stringify({ error: "Usuario no pertenece a tu workspace" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "No puedes eliminar tu propia cuenta" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { user_id, role, role_id, full_name, password } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id es requerido" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("workspace_id")
        .eq("id", user_id)
        .single();

      if (!targetProfile || targetProfile.workspace_id !== callerProfile.workspace_id) {
        return new Response(JSON.stringify({ error: "Usuario no pertenece a tu workspace" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (password && password.length > 0) {
        const hasMin = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasNum = /[0-9]/.test(password);
        if (!hasMin || !hasUpper || !hasNum) {
          return new Response(JSON.stringify({ error: "La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y al menos un número" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error: pwError } = await adminClient.auth.admin.updateUserById(user_id, { password });
        if (pwError) {
          return new Response(JSON.stringify({ error: pwError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const updates: Record<string, unknown> = {};
      if (role) updates.role = role;
      if (role_id !== undefined) updates.role_id = role_id;
      if (full_name !== undefined) updates.full_name = full_name || null;

      if (Object.keys(updates).length > 0) {
        const { error: profileUpdateError } = await adminClient
          .from("profiles")
          .update(updates)
          .eq("id", user_id);
        if (profileUpdateError) {
          return new Response(JSON.stringify({ error: profileUpdateError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE USER
    const { email, password, role, role_id, full_name } = body;

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: "Email, contraseña y rol son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasMin = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    if (!hasMin || !hasUpper || !hasNum) {
      return new Response(JSON.stringify({ error: "La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y al menos un número" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });

    if (createError) {
      if (createError.message.includes("already been registered")) {
        return new Response(
          JSON.stringify({ success: false, code: "email_already_exists", error: "Ya existe un usuario registrado con este correo electrónico" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileUpdates: Record<string, unknown> = {
      role,
      workspace_id: callerProfile.workspace_id,
      full_name: full_name || null,
    };
    if (role_id) profileUpdates.role_id = role_id;

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        email: email,
        ...profileUpdates,
      }, { onConflict: "id" });

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
