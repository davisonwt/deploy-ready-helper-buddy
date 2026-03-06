import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
    // --- Authentication: require a valid service-role or authenticated user JWT ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    // --- End authentication ---

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

    // Get bestower email
    const { data: bestowerProfile, error: bestowerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', bestowal.bestower_id)
      .single();

    if (bestowerError || !bestowerProfile) {
      throw new Error(`Failed to fetch bestower profile: ${bestowerError?.message}`);
    }

    // Get bestower email from auth.users
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
    let notifySower = false;

    switch (type) {
      case 'created':
        subject = `🌱 Bestowal Confirmation - ${bestowal.orchards?.title}`;
        bestowerHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; margin: 0;">🌱 Bestowal Created!</h1>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Dear ${bestowerName},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Thank you for your generous bestowal! Your contribution to <strong>"${bestowal.orchards?.title}"</strong> has been created and is being processed.
            </p>
            
            <div style="background: #f8fffe; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 10px 0; color: #22c55e;">Bestowal Details:</h3>
              <p style="margin: 5px 0; color: #333;"><strong>Amount:</strong> ${bestowal.amount} ${bestowal.currency}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Pockets:</strong> ${bestowal.pockets_count}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Orchard:</strong> ${bestowal.orchards?.title}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Status:</strong> Processing</p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              You will receive another email once your bestowal is confirmed and the orchard owner has been notified.
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="font-size: 14px; color: #666; margin: 0;">
                Thank you for sowing seeds that will grow into beautiful orchards! 🌳
              </p>
            </div>
          </div>
        `;
        break;

      case 'completed':
        subject = `✅ Bestowal Completed - ${bestowal.orchards?.title}`;
        bestowerHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; margin: 0;">✅ Bestowal Completed!</h1>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Dear ${bestowerName},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Great news! Your bestowal for <strong>"${bestowal.orchards?.title}"</strong> has been successfully completed. The orchard owner has been notified and your contribution is now part of their growing orchard.
            </p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 10px 0; color: #22c55e;">Final Bestowal Details:</h3>
              <p style="margin: 5px 0; color: #333;"><strong>Amount:</strong> ${bestowal.amount} ${bestowal.currency}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Pockets Filled:</strong> ${bestowal.pockets_count}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Orchard:</strong> ${bestowal.orchards?.title}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Payment Reference:</strong> ${bestowal.payment_reference || 'N/A'}</p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              Your generosity helps dreams grow into reality. Thank you for being part of the Sow2Grow community!
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="font-size: 14px; color: #666; margin: 0;">
                🌱 → 🌳 Your seed has been planted and is growing!
              </p>
            </div>
          </div>
        `;
        notifySower = true;
        break;

      case 'failed':
        subject = `❌ Bestowal Payment Issue - ${bestowal.orchards?.title}`;
        bestowerHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #ef4444; margin: 0;">❌ Payment Issue</h1>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Dear ${bestowerName},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              We encountered an issue processing your bestowal for <strong>"${bestowal.orchards?.title}"</strong>. This could be due to payment processing issues or other technical problems.
            </p>
            
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 10px 0; color: #ef4444;">What happens next:</h3>
              <ul style="margin: 10px 0; padding-left: 20px; color: #333;">
                <li>No charges have been made to your account</li>
                <li>You can try your bestowal again</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                If you continue to experience issues, please contact support@sow2grow.online
              </p>
            </div>
          </div>
        `;
        break;
    }

    // Send email to bestower
    const bestowerEmailResponse = await resend.emails.send({
      from: "Sow2Grow <no-reply@sow2grow.online>",
      to: [bestowerEmail],
      subject: subject,
      html: bestowerHtml,
    });

    console.log("Bestower notification sent:", bestowerEmailResponse);

    // Send notification to sower if bestowal completed
    if (notifySower && bestowal.orchards?.user_id) {
      const { data: sowerAuth, error: sowerAuthError } = await supabase.auth.admin.getUserById(bestowal.orchards.user_id);
      
      if (!sowerAuthError && sowerAuth.user?.email) {
        const sowerSubject = `🎉 New Bestowal Received - ${bestowal.orchards?.title}`;
        const sowerHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #22c55e; margin: 0;">🎉 New Bestowal Received!</h1>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Dear ${sowerName},
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Wonderful news! You've received a new bestowal for your orchard <strong>"${bestowal.orchards?.title}"</strong>.
            </p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <h3 style="margin: 0 0 10px 0; color: #22c55e;">Bestowal Details:</h3>
              <p style="margin: 5px 0; color: #333;"><strong>From:</strong> ${bestowerName}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Amount:</strong> ${bestowal.amount} ${bestowal.currency}</p>
              <p style="margin: 5px 0; color: #333;"><strong>Pockets Filled:</strong> ${bestowal.pockets_count}</p>
              ${bestowal.message ? `<p style="margin: 5px 0; color: #333;"><strong>Message:</strong> "${bestowal.message}"</p>` : ''}
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              This brings you closer to your orchard goal! Keep nurturing your vision and engaging with your community.
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="font-size: 14px; color: #666; margin: 0;">
                Your orchard is growing! 🌱 → 🌳
              </p>
            </div>
          </div>
        `;

        await resend.emails.send({
          from: "Sow2Grow <no-reply@sow2grow.online>",
          to: [sowerAuth.user.email],
          subject: sowerSubject,
          html: sowerHtml,
        });

        console.log("Sower notification sent");
      }
    }

    // Return success WITHOUT exposing email addresses
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notifications sent successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in send-bestowal-notifications function:", error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send notifications',
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
