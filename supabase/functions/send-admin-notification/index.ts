import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminNotificationRequest {
  email: string;
  firstName: string;
  lastName: string;
  location?: string;
  phone?: string;
  currency: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, location, phone, currency }: AdminNotificationRequest = await req.json();

    // Send to gosats@sow2grow.online for all call-to-action notifications
    const adminEmail = "gosats@sow2grow.online";

    const emailResponse = await resend.emails.send({
      from: "Sow2Grow <sow@sow2grow.org>",
      to: [adminEmail],
      subject: "🚨 New Farm Stall Owner Registered!",
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
          <div style="background: white; border-radius: 15px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #22c55e, #3b82f6); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">🌱</span>
              </div>
              <h1 style="color: #1f2937; font-size: 24px; margin: 0;">New Farm Stall Owner!</h1>
              <p style="color: #6b7280; margin: 10px 0 0;">A new guardian has joined our community</p>
            </div>

            <!-- User Details -->
            <div style="background: #f8fafc; border-radius: 10px; padding: 25px; margin-bottom: 25px;">
              <h3 style="color: #1f2937; margin: 0 0 20px; font-size: 18px;">👤 New Member Details:</h3>
              
              <div style="display: grid; gap: 15px;">
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Name:</span>
                  <span style="color: #1f2937; font-weight: 600;">${firstName} ${lastName}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Email:</span>
                  <span style="color: #1f2937; font-weight: 600;">${email}</span>
                </div>
                
                ${location ? `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Location:</span>
                  <span style="color: #1f2937; font-weight: 600;">${location}</span>
                </div>
                ` : ''}
                
                ${phone ? `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Phone:</span>
                  <span style="color: #1f2937; font-weight: 600;">${phone}</span>
                </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="color: #6b7280; font-weight: 500;">Preferred Currency:</span>
                  <span style="color: #1f2937; font-weight: 600;">${currency}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; padding: 10px 0;">
                  <span style="color: #6b7280; font-weight: 500;">Registration Time:</span>
                  <span style="color: #1f2937; font-weight: 600;">${new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>

            <!-- Action Items -->
            <div style="background: linear-gradient(135deg, #dcfce7, #dbeafe); border-radius: 10px; padding: 20px; margin-bottom: 25px;">
              <h3 style="color: #16a34a; margin: 0 0 15px; font-size: 16px;">📋 Recommended Actions:</h3>
              <ul style="color: #059669; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Welcome the new member to the community</li>
                <li>Monitor their first farm stall creation</li>
                <li>Provide guidance if needed</li>
                <li>Add them to community updates</li>
              </ul>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                sow2grow Admin Notification System<br>
                <em>Growing our community one stall at a time 🌾</em>
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Admin notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
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