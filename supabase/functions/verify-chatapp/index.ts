import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { roomId } = await req.json();

    // Verify user is participant in this room
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      throw new Error('User not in this room');
    }

    // Update profile verification status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_chatapp_verified: true })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update verification status:', updateError);
      throw updateError;
    }

    // Update the verification message to show success
    const { error: messageError } = await supabase
      .from('chat_messages')
      .update({
        content: '✅ Verified! You may now close this chat and explore Sow2Grow.',
        system_metadata: {
          type: 'verification',
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
      user.id,
      {
        app_metadata: {
          ...user.app_metadata,
          chatapp_verified: true
        }
      }
    );

    if (sessionError) {
      console.error('Failed to update user metadata:', sessionError);
    }

    console.log('User verified successfully:', user.id);

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
