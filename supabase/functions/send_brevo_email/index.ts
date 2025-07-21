import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BrevoEmailRequest {
  to: string[];
  subject: string;
  html: string;
  from: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, from }: BrevoEmailRequest = await req.json();

    // Get Brevo SMTP credentials from secrets
    const brevoSmtpSecret = Deno.env.get('BREVO_SMTP');
    if (!brevoSmtpSecret) {
      throw new Error('BREVO_SMTP secret not configured');
    }

    let smtpConfig;
    try {
      smtpConfig = JSON.parse(brevoSmtpSecret);
    } catch (parseError) {
      throw new Error('Invalid BREVO_SMTP secret format. Expected JSON.');
    }

    const { host, port, username, password } = smtpConfig;

    if (!host || !port || !username || !password) {
      throw new Error('Missing required SMTP configuration in BREVO_SMTP secret');
    }

    console.log('Sending email via Brevo SMTP...');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('From:', from);

    // Use port 465 for SSL/TLS connection
    const conn = await Deno.connectTls({
      hostname: host,
      port: 465, // Force SSL port for Brevo
    });

    // Create email message
    const boundary = `----formdata-${Date.now()}`;
    
    // Build email headers and body
    const emailHeaders = [
      `From: ${from}`,
      `To: ${to.join(', ')}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      html,
      '',
      `--${boundary}--`
    ].join('\r\n');

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to send command and get response
    const sendCommand = async (command: string): Promise<string> => {
      await conn.write(encoder.encode(command + '\r\n'));
      const buffer = new Uint8Array(1024);
      const bytesRead = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, bytesRead || 0));
    };

    try {
      // SMTP conversation
      let response = await sendCommand(`EHLO ${host}`);
      console.log('EHLO response:', response);

      response = await sendCommand(`AUTH LOGIN`);
      console.log('AUTH LOGIN response:', response);

      // Send base64 encoded username
      const usernameB64 = btoa(username);
      response = await sendCommand(usernameB64);
      console.log('Username response:', response);

      // Send base64 encoded password
      const passwordB64 = btoa(password);
      response = await sendCommand(passwordB64);
      console.log('Password response:', response);

      response = await sendCommand(`MAIL FROM: <${from}>`);
      console.log('MAIL FROM response:', response);

      // Add recipients
      for (const recipient of to) {
        response = await sendCommand(`RCPT TO: <${recipient}>`);
        console.log(`RCPT TO ${recipient} response:`, response);
      }

      response = await sendCommand('DATA');
      console.log('DATA response:', response);

      await conn.write(encoder.encode(emailHeaders + '\r\n.\r\n'));
      const dataBuffer = new Uint8Array(1024);
      const dataBytesRead = await conn.read(dataBuffer);
      const dataResponse = decoder.decode(dataBuffer.subarray(0, dataBytesRead || 0));
      console.log('Data send response:', dataResponse);

      response = await sendCommand('QUIT');
      console.log('QUIT response:', response);

      conn.close();

      console.log('Email sent successfully via Brevo SMTP');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email sent successfully',
          recipients: to.length 
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );

    } catch (smtpError) {
      conn.close();
      throw smtpError;
    }

  } catch (error: any) {
    console.error('Error in send_brevo_email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send email',
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