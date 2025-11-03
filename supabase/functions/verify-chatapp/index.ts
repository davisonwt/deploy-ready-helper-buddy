import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('=== verify-chatapp function called ===');
  console.log('Method:', req.method);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Reading request body...');
    const body = await req.json();
    const { username, email, password, roomId, userId } = body;

    console.log('Verification attempt for user:', userId);
    console.log('Username provided:', username);
    console.log('Email provided:', email);
    console.log('Room ID:', roomId);

    if (!username || !email || !password || !roomId || !userId) {
      throw new Error('Missing required fields');
    }

    // Get user profile to check username and email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, user_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      throw new Error('Profile not found');
    }

    // Get user email from auth.users
    const { data: { user: authUser }, error: authUserError } = await supabase.auth.admin.getUserById(userId);
    
    if (authUserError || !authUser) {
      console.error('Auth user not found:', authUserError);
      throw new Error('User not found');
    }

    // Validate username (case-insensitive)
    if (username.toLowerCase() !== profile.username?.toLowerCase()) {
      console.log('Username mismatch');
      return new Response(
        JSON.stringify({ 
          success: false,
          field: 'username',
          error: 'Username does not match our records' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    // Validate email (case-insensitive)
    if (email.toLowerCase() !== authUser.email?.toLowerCase()) {
      console.log('Email mismatch');
      return new Response(
        JSON.stringify({ 
          success: false,
          field: 'email',
          error: 'Email does not match our records' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    // Validate password by attempting sign-in
    console.log('Validating password...');
    const anonSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email: authUser.email!,
      password: password
    });

    if (signInError) {
      console.log('Password validation failed:', signInError.message);
      console.log('Sign in error code:', signInError.status);
      return new Response(
        JSON.stringify({ 
          success: false,
          field: 'password',
          error: 'Password does not match our records' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    // Sign out the validation session immediately
    console.log('Password valid, signing out validation session...');
    await anonSupabase.auth.signOut();

    console.log('All credentials validated successfully');

    // Verify user is participant in this room
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      throw new Error('User not in this room');
    }

    // Update profile verification status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_chatapp_verified: true })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update verification status:', updateError);
      throw updateError;
    }

    // Update the verification message to show success
    const { error: messageError } = await supabase
      .from('chat_messages')
      .update({
        content: '✅ Credentials confirmed. You may now close this chat and log in.',
        system_metadata: {
          type: 'credential_verification',
          is_system: true,
          sender_name: 'Sow2Grow Bot',
          verified: true,
          verified_at: new Date().toISOString()
        }
      })
      .eq('room_id', roomId)
      .is('sender_id', null);

    if (messageError) {
      console.error('Failed to update message:', messageError);
    }

    // Generate new token with verification claim
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          chatapp_verified: true
        }
      }
    );

    if (sessionError) {
      console.error('Failed to update user metadata:', sessionError);
    }

    console.log('User verified successfully:', userId);

    return new Response(
      JSON.stringify({ 
        success: true,
        verified: true,
        message: 'Account verified successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
