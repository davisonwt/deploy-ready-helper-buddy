import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { checkRateLimit, createRateLimitResponse } from '../_shared/rateLimiter.ts'

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    'https://sow2growapp.com',
    'https://www.sow2growapp.com',
    'https://app.sow2grow.com',
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-authorization, accept',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
      'Vary': 'Origin',
    };
  }
  
  // Deny unauthorized origins
  return {
    'Access-Control-Allow-Origin': 'null',
    'Content-Type': 'application/json',
  };
}

serve(async (req) => {
  console.log('verify-chatapp function called, method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { username, email, password, roomId, userId } = body;

    // Input validation
    if (!username || typeof username !== 'string' || username.trim().length === 0 || username.length > 50) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid input' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid input' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    
    if (!password || typeof password !== 'string' || password.length < 6) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid input' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    
    if (!roomId || !userId) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid input' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting - 3 attempts per 15 minutes per user
    const rateLimitAllowed = await checkRateLimit(supabase, userId, 'credential_verification', 3, 15);
    if (!rateLimitAllowed) {
      console.log(`Rate limit exceeded for user ${userId}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Too many verification attempts. Please try again in 15 minutes.' 
        }),
        { 
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 429
        }
      );
    }

    console.log('Verification attempt for user:', userId);

    // Fetch all data in parallel (prevents timing attacks)
    const [profileResult, authUserResult] = await Promise.all([
      supabase.from('profiles').select('username, user_id').eq('user_id', userId).single(),
      supabase.auth.admin.getUserById(userId)
    ]);

    const { data: profile, error: profileError } = profileResult;
    const { data: { user: authUser }, error: authUserError } = authUserResult;

    if (profileError || !profile || authUserError || !authUser) {
      console.error('Verification failed - user not found');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Verification failed. Please check your credentials.' 
        }),
        { 
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    // Validate all credentials together (prevents timing attacks)
    const usernameValid = username.toLowerCase() === profile.username?.toLowerCase();
    const emailValid = email.toLowerCase() === authUser.email?.toLowerCase();
    
    // Only check password if username and email are valid
    let passwordValid = false;
    if (usernameValid && emailValid) {
      const anonSupabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      
      const { error: signInError } = await anonSupabase.auth.signInWithPassword({
        email: authUser.email!,
        password: password
      });

      passwordValid = !signInError;
    }

    // Return generic error for any credential failure
    if (!usernameValid || !emailValid || !passwordValid) {
      console.log('Verification failed - invalid credentials');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Verification failed. Please check your credentials.' 
        }),
        { 
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    // All credentials verified - update verification status
    console.log('Credentials verified successfully');

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        verification_status: 'verified',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update verification status:', updateError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to complete verification. Please try again.' 
        }),
        { 
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Delete verification message
    await supabase
      .from('chat_messages')
      .delete()
      .eq('room_id', roomId)
      .eq('message_type', 'text')
      .ilike('content', '%finish set-up%');

    // Send success message using secure system message function
    await supabase.rpc('insert_system_chat_message', {
      p_room_id: roomId,
      p_content: `✅ Verification successful! Welcome to Sow2Grow, ${profile.username}! Your account is now fully activated.`,
      p_message_type: 'text',
      p_system_metadata: {
        type: 'verification_success',
        is_system: true,
        sender_name: 'Sow2Grow Bot',
        user_id: userId
      }
    });

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in verify-chatapp:', error.message, error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred. Please try again later.',
        requestId: crypto.randomUUID()
      }),
      { 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})
