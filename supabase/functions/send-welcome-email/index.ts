import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName }: WelcomeEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "sow2grow <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to sow2grow - Your Farm Stall Awaits! 🌱",
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #22c55e, #3b82f6); padding: 40px 20px;">
          <div style="background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            
            <!-- Header with Logo Placeholder -->
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e, #3b82f6); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 32px;">🌱</span>
              </div>
              <h1 style="color: #22c55e; font-size: 28px; margin: 0; font-weight: bold;">Welcome to sow2grow</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 10px 0 0;">The 364yhvh Community Farm Mall</p>
            </div>

            <!-- Welcome Message -->
            <div style="text-align: center; margin-bottom: 40px;">
              <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">Welcome ${firstName} ${lastName}! 🎉</h2>
              <p style="color: #4b5563; font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
                <strong>Congratulations!</strong> You are now the guardian of your own farm stall within our community farm mall.
              </p>
              
              <div style="background: linear-gradient(135deg, #dcfce7, #dbeafe); border-radius: 15px; padding: 25px; margin: 30px 0;">
                <h3 style="color: #16a34a; margin: 0 0 15px; font-size: 20px;">🌾 Your Journey Begins Now</h3>
                <p style="color: #059669; margin: 0; font-size: 16px; line-height: 1.5;">
                  As a farm stall guardian, you're part of a growing community that believes in abundance, sharing, and mutual support. Your stall is ready to flourish!
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
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Add your details and preferences to personalize your farm stall experience.</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: flex-start; gap: 15px;">
                  <div style="width: 30px; height: 30px; background: #8b5cf6; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="color: white; font-weight: bold; font-size: 14px;">3</span>
                  </div>
                  <div>
                    <h4 style="color: #1f2937; margin: 0 0 5px; font-size: 16px;">Explore the Community</h4>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Discover other farm stalls and start your journey of giving and receiving.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Scripture Quote -->
            <div style="background: linear-gradient(135deg, #fef3c7, #fed7d7); border-radius: 15px; padding: 25px; text-align: center; margin-bottom: 30px;">
              <p style="color: #92400e; font-style: italic; font-size: 16px; margin: 0 0 10px; line-height: 1.5;">
                "Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap."
              </p>
              <p style="color: #b45309; font-weight: bold; font-size: 14px; margin: 0;">— Luke 6:38</p>
            </div>

            <!-- Call to Action -->
            <div style="text-align: center;">
              <a href="${Deno.env.get("SITE_URL") || "https://your-app-url.com"}" 
                 style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; margin-bottom: 20px;">
                🌱 Visit Your Farm Stall
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

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);