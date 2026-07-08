import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BestowAlNotificationRequest {
  bestowAlId: string;
  type: 'created' | 'completed' | 'failed';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // AuthN/AuthZ: verify caller JWT; only bestower, orchard owner, service_role, or admin/gosat may trigger
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7).trim();

    // Allow trusted server-side callers (service role key)
    const isServiceRole = token === supabaseServiceRoleKey;

    let callerId: string | null = null;
    let callerIsAdmin = false;
    if (!isServiceRole) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = userData.user.id;

      // Check admin/gosat role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', callerId);
      callerIsAdmin = !!roles?.some((r: any) => ['admin', 'gosat'].includes(r.role));
    }

    const { bestowAlId, type }: BestowAlNotificationRequest = await req.json();

    console.log(`Processing bestowal notification: ${type} for ${bestowAlId}`);

    // Get bestowal details with related data
    const { data: bestowal, error: bestowAlError } = await supabase
      .from('bestowals')
      .select(`
        *,
        orchards (
          title,
          user_id,
          profiles (
            first_name,
            last_name,
            display_name
          )
        ),
        bestower_profile:profiles!bestower_profile_id (
          first_name,
          last_name,
          display_name
        )
      `)
      .eq('id', bestowAlId)
      .single();

    if (bestowAlError || !bestowal) {
      throw new Error(`Failed to fetch bestowal: ${bestowAlError?.message}`);
    }

    // Authorization: caller must be bestower, orchard owner, service_role, or admin
    if (!isServiceRole && !callerIsAdmin) {
      const orchardOwnerId = bestowal.orchards?.user_id;
      if (callerId !== bestowal.bestower_id && callerId !== orchardOwnerId) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get bestower email
    const { data: bestowerProfile, error: bestowerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', bestowal.bestower_id)
      .single();

    if (bestowerError || !bestowerProfile) {
      throw new Error(`Failed to fetch bestower profile: ${bestowerError?.message}`);
    }

    const { data: bestowerAuth, error: bestowerAuthError } = await supabase.auth.admin.getUserById(bestowal.bestower_id);
    if (bestowerAuthError || !bestowerAuth.user?.email) {
      throw new Error(`Failed to fetch bestower email: ${bestowerAuthError?.message}`);
    }

    const bestowerEmail = bestowerAuth.user.email;
    const bestowerName = bestowerProfile.display_name || `${bestowerProfile.first_name} ${bestowerProfile.last_name}`.trim() || 'Friend';
    const sowerName = bestowal.orchards?.profiles?.display_name ||
                     `${bestowal.orchards?.profiles?.first_name} ${bestowal.orchards?.profiles?.last_name}`.trim() ||
                     'Orchard Owner';

    let subject = "";
    let bestowerHtml = "";
    let sowerEmails: string[] = [];

    switch (type) {
      case 'created':
        subject = `🌱 Bestowal Confirmation - ${bestowal.orchards?.title}`;
        bestowerHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #22c55e;">🌱 Bestowal Created!</h1>
          <p>Dear ${bestowerName},</p>
          <p>Thank you for your generous bestowal to <strong>"${bestowal.orchards?.title}"</strong>.</p>
          <p>Amount: ${bestowal.amount} ${bestowal.currency}</p>
        </div>`;
        break;
      case 'completed':
        subject = `✅ Bestowal Completed - ${bestowal.orchards?.title}`;
        bestowerHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #22c55e;">✅ Bestowal Completed!</h1>
          <p>Dear ${bestowerName},</p>
          <p>Your bestowal to <strong>"${bestowal.orchards?.title}"</strong> is complete.</p>
        </div>`;
        if (bestowal.orchards?.user_id) {
          const { data: sowerAuth } = await supabase.auth.admin.getUserById(bestowal.orchards.user_id);
          if (sowerAuth.user?.email) sowerEmails.push(sowerAuth.user.email);
        }
        break;
      case 'failed':
        subject = `❌ Bestowal Payment Issue - ${bestowal.orchards?.title}`;
        bestowerHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ef4444;">❌ Payment Issue</h1>
          <p>Dear ${bestowerName},</p>
          <p>We encountered an issue processing your bestowal for <strong>"${bestowal.orchards?.title}"</strong>.</p>
        </div>`;
        break;
    }

    await resend.emails.send({
      from: "Sow2Grow <no-reply@sow2grow.online>",
      to: [bestowerEmail],
      subject,
      html: bestowerHtml,
    });

    if (type === 'completed' && sowerEmails.length > 0) {
      const sowerHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #22c55e;">🎉 New Bestowal Received!</h1>
        <p>Dear ${sowerName},</p>
        <p>You've received a new bestowal from ${bestowerName} for <strong>"${bestowal.orchards?.title}"</strong>.</p>
        <p>Amount: ${bestowal.amount} ${bestowal.currency}</p>
      </div>`;
      for (const sowerEmail of sowerEmails) {
        await resend.emails.send({
          from: "Sow2Grow <no-reply@sow2grow.online>",
          to: [sowerEmail],
          subject: `🎉 New Bestowal Received - ${bestowal.orchards?.title}`,
          html: sowerHtml,
        });
      }
    }

    // Do NOT echo email addresses in the response — return counts only
    return new Response(
      JSON.stringify({
        success: true,
        message: "Notifications sent successfully",
        sent: {
          bestower: 1,
          sowers: sowerEmails.length,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-bestowal-notifications function:", error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notifications', success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
