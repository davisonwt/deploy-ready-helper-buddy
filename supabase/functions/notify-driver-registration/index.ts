import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-my-custom-header, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

interface NotificationRequest {
  driverName: string;
  driverEmail: string;
  vehicleType: string;
  isUpdate: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driverName, driverEmail, vehicleType, isUpdate }: NotificationRequest = await req.json();

    // Get Brevo API key from secrets
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      console.warn('BREVO_API_KEY not configured, skipping email notification');
      return new Response(
        JSON.stringify({ success: true, message: 'Email skipped - no API key configured' }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@sow2grow.com';
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@sow2grow.com';

    console.log('Sending driver registration notification...');
    console.log('Driver:', driverName, driverEmail);
    console.log('Vehicle Type:', vehicleType);
    console.log('Is Update:', isUpdate);

    // Email to driver
    const driverEmailContent = isUpdate
      ? `
        <h1>Registration Updated</h1>
        <p>Hi ${driverName},</p>
        <p>Your Community Driver registration has been successfully updated!</p>
        <p><strong>Vehicle Type:</strong> ${vehicleType}</p>
        <p>Your updated profile is now under review. Once approved, you'll be visible to the community.</p>
        <p>Thank you for being part of the Sow2Grow community!</p>
        <p>Best regards,<br>The Sow2Grow Team</p>
      `
      : `
        <h1>Welcome to Community Drivers!</h1>
        <p>Hi ${driverName},</p>
        <p>Thank you for registering as a Community Driver! 🚗</p>
        <p><strong>Vehicle Type:</strong> ${vehicleType}</p>
        <p>Your registration is now under review. Once approved, fellow sowers will be able to find and hire you for:</p>
        <ul>
          <li>Deliveries of seeds and products</li>
          <li>Passenger transport</li>
          <li>Hauling larger items</li>
        </ul>
        <p>We'll notify you once your registration is approved.</p>
        <p>Thank you for helping grow our community!</p>
        <p>Best regards,<br>The Sow2Grow Team</p>
      `;

    // Send email to driver
    const driverEmailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: "Sow2Grow", email: fromEmail },
        to: [{ email: driverEmail, name: driverName }],
        subject: isUpdate ? 'Your Community Driver Registration Updated' : 'Welcome to Community Drivers!',
        htmlContent: driverEmailContent
      })
    });

    if (!driverEmailResponse.ok) {
      const error = await driverEmailResponse.json();
      console.error('Failed to send driver email:', error);
    } else {
      console.log('Driver email sent successfully');
    }

    // Send notification to admin
    const adminEmailContent = `
      <h1>New Community Driver ${isUpdate ? 'Update' : 'Registration'}</h1>
      <p>A driver has ${isUpdate ? 'updated their' : 'submitted a new'} registration:</p>
      <ul>
        <li><strong>Name:</strong> ${driverName}</li>
        <li><strong>Email:</strong> ${driverEmail}</li>
        <li><strong>Vehicle Type:</strong> ${vehicleType}</li>
      </ul>
      <p>Please review the registration in the admin panel.</p>
    `;

    const adminEmailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: "Sow2Grow System", email: fromEmail },
        to: [{ email: adminEmail }],
        subject: `Community Driver ${isUpdate ? 'Update' : 'Registration'}: ${driverName}`,
        htmlContent: adminEmailContent
      })
    });

    if (!adminEmailResponse.ok) {
      const error = await adminEmailResponse.json();
      console.error('Failed to send admin email:', error);
    } else {
      console.log('Admin email sent successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notifications sent successfully'
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in notify-driver-registration function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send notifications',
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
