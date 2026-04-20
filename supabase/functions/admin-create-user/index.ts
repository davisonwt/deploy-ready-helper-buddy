import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Max-Age": "86400",
};

function generateTempPassword(): string {
  // 16-char temp password, mixed case + digits + symbols
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = rand(upper) + rand(lower) + rand(digits) + rand(symbols);
  for (let i = 0; i < 12; i++) pwd += rand(all);
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin/gosat
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id);

    const isAuthorized = roles?.some(
      (r: any) => r.role === "admin" || r.role === "gosat"
    );
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions. Admin/gosat only." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      email,
      first_name,
      last_name,
      phone,
      city,
      country,
      referrer_user_id,
      send_welcome,
    } = body || {};

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tempPassword = generateTempPassword();
    const display_name = [first_name, last_name].filter(Boolean).join(" ") || email;

    // Create the auth user (auto-confirmed so they can login immediately)
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: first_name || null,
        last_name: last_name || null,
        full_name: display_name,
        created_by_admin: callingUser.id,
        must_change_password: true,
      },
    });

    if (createErr || !created?.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message || "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = created.user.id;

    // Upsert profile fields (handle_new_user trigger usually creates the row)
    await adminClient
      .from("profiles")
      .upsert(
        {
          user_id: newUserId,
          first_name: first_name || null,
          last_name: last_name || null,
          display_name,
          email,
          phone: phone || null,
          country: country || null,
          location: city || null,
        },
        { onConflict: "user_id" }
      );

    // Link to referrer's tribe via referral_circle
    let referralLinked = false;
    if (referrer_user_id && typeof referrer_user_id === "string") {
      const { error: refErr } = await adminClient
        .from("referral_circle")
        .insert({
          referrer_id: referrer_user_id,
          referred_user_id: newUserId,
          status: "joined",
        });
      if (!refErr) referralLinked = true;
      else console.error("referral_circle insert failed:", refErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        email,
        temp_password: tempPassword,
        referral_linked: referralLinked,
        send_welcome: !!send_welcome,
        message:
          "Account created. Share temp password with the user; they should reset it after first login.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("admin-create-user error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
