import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-my-custom-header, x-idempotency-key, x-csrf-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
}

/** Escape HTML special characters to prevent injection in email templates */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { email, firstName, lastName }: WelcomeEmailRequest = await req.json();

    // Sanitize user-provided values before embedding in HTML
    const safeFirstName = escapeHtml(firstName.slice(0, 100));
    const safeLastName = escapeHtml(lastName.slice(0, 100));
    const safeEmail = escapeHtml(email.slice(0, 255));

    // Send welcome email to user
    const userEmailResponse = await resend.emails.send({
      from: "Sow2Grow <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Sow2Grow - Verify Your Email",
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #22c55e, #3b82f6); padding: 40px 20px;">
          <div style="background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            
            <!-- Header with Logo Placeholder -->
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e, #3b82f6); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 32px;">🌱</span>
              </div>
              <h1 style="color: #22c55e; font-size: 28px; margin: 0; font-weight: bold;">Welcome to Sow2Grow</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 10px 0 0;">A branch of 364yhvh digital farm</p>
            </div>

            <!-- Welcome Message -->
            <div style="text-align: center; margin-bottom: 40px;">
              <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Welcome ${safeFirstName} ${safeLastName}! 🎉</h2>
              <p style="color: #4b5563; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
                Welcome to Sow2Grow, a branch of 364yhvh digital farm.
              </p>
              <p style="color: #4b5563; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
                Please verify your email address and become the owner of your own farmstall within our mall.
              </p>
              
              <div style="background: linear-gradient(135deg, #dcfce7, #dbeafe); border-radius: 15px; padding: 25px; margin: 30px 0;">
                <h3 style="color: #16a34a; margin: 0 0 15px; font-size: 20px;">🌾 Your Journey Begins Now</h3>
                <p style="color: #059669; margin: 0; font-size: 16px; line-height: 1.5;">
                  As a farmstall owner, you're part of a growing community that believes in abundance, sharing, and mutual support. Your stall is ready to flourish!
                </p>
              </div>
            </div>

            <!-- Next Steps -->
            <div style="margin-bottom: 40px;">
              <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 25px; text-align: center;">🚀 Next Steps:</h3>
              
              <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                  <div style="width: 30px; height: 30px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="color: white; font-weight: bold; font-size: 14px;">1</span>
                  </div>
                  <div>
                    <h4 style="color: #1f2937; margin: 0 0 5px; font-size: 16px;">Verify Your Email</h4>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Check your inbox for a verification email to activate your account.</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                  <div style="width: 30px; height: 30px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="color: white; font-weight: bold; font-size: 14px;">2</span>
                  </div>
                  <div>
                    <h4 style="color: #1f2937; margin: 0 0 5px; font-size: 16px;">Complete Your Profile</h4>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Add your details and preferences to personalize your farmstall experience.</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                  <div style="width: 30px; height: 30px; background: #8b5cf6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="color: white; font-weight: bold; font-size: 14px;">3</span>
                  </div>
                  <div>
                    <h4 style="color: #1f2937; margin: 0 0 5px; font-size: 16px;">Explore the Community</h4>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Discover other farmstalls and start your journey of giving and receiving.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center;">
              <a href="${Deno.env.get("SITE_URL") || "https://your-app-url.com"}" 
                 style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; margin-bottom: 20px;">
                🌱 Visit Your Farmstall
              </a>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Welcome to the 364yhvh Community 🌾<br>
                <em>Where every seed planted grows into abundance</em>
              </p>
            </div>
          </div>
        </div>
      `,
    });

    // Send notification to admin
    const adminEmailResponse = await resend.emails.send({
      from: "Sow2Grow <onboarding@resend.dev>",
      to: ["new@sow2grow.org"],
      subject: "New Sower and Bestower Registered",
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
          <div style="background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #22c55e, #3b82f6); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">🌱</span>
              </div>
              <h1 style="color: #1f2937; font-size: 24px; margin: 0;">New Sower and Bestower!</h1>
              <p style="color: #6b7280; margin: 10px 0 0;">You have a new sower and bestower</p>
            </div>

            <!-- User Details -->
            <div style="background: #f8fafc; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
              <h3 style="color: #1f2937; margin: 0 0 20px; font-size: 18px;">👤 New Member Details:</h3>
              
              <div style="display: grid; gap: 15px;">
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Name:</span>
                  <span style="color: #1f2937; font-weight: 600;">${safeFirstName} ${safeLastName}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Email:</span>
                  <span style="color: #1f2937; font-weight: 600;">${safeEmail}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                  <span style="color: #6b7280; font-weight: 500;">Registration Time:</span>
                  <span style="color: #1f2937; font-weight: 600;">${new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Sow2Grow Admin Notification System<br>
                <em>Growing our community one stall at a time 🌾</em>
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("User email sent successfully:", userEmailResponse);
    console.log("Admin email sent successfully:", adminEmailResponse);

    return new Response(JSON.stringify({ userEmail: userEmailResponse, adminEmail: adminEmailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send welcome email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);