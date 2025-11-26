import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { feedback, user_id } = await req.json();

    if (!feedback || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing feedback or user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user profile for display name
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name, first_name, username')
      .eq('user_id', user_id)
      .single();

    const userName = userProfile?.display_name || userProfile?.first_name || userProfile?.username || 'User';

    // Get all gosat users
    const { data: gosats, error: gosatError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'gosat');

    if (gosatError) {
      console.error('Error fetching gosats:', gosatError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch gosats' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!gosats || gosats.length === 0) {
      console.warn('No gosats found');
      // Still send thank you message to user
    }

    // Send feedback to each gosat
    const gosatPromises = (gosats || []).map(async (gosat) => {
      try {
        // Get or create direct room between user and gosat
        const { data: roomId, error: roomError } = await supabaseAdmin.rpc('get_or_create_direct_room', {
          user1_id: user_id,
          user2_id: gosat.user_id,
        });

        if (roomError || !roomId) {
          console.error(`Failed to create room with gosat ${gosat.user_id}:`, roomError);
          return;
        }

        const roomIdValue = typeof roomId === 'string' ? roomId : Array.isArray(roomId) ? roomId[0] : roomId;

        // Send feedback message to gosat
        const feedbackMessage = [
          '📝 New Feedback Received',
          '',
          `From: ${userName}`,
          '',
          'Feedback:',
          feedback,
          '',
          `---`,
          `User ID: ${user_id}`,
          `Submitted: ${new Date().toLocaleString()}`,
        ].join('\n');

        await supabaseAdmin.rpc('insert_system_chat_message', {
          p_room_id: roomIdValue,
          p_content: feedbackMessage,
          p_message_type: 'text',
          p_system_metadata: {
            type: 'user_feedback',
            user_id: user_id,
            feedback_type: 'help_feedback',
            is_system: true,
          },
        });

        // Update room timestamp
        await supabaseAdmin
          .from('chat_rooms')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', roomIdValue);
      } catch (error) {
        console.error(`Error sending feedback to gosat ${gosat.user_id}:`, error);
      }
    });

    await Promise.all(gosatPromises);

    // Send thank you message back to user
    // Use the first gosat's room or create a room with a gosat
    if (gosats && gosats.length > 0) {
      try {
        const { data: thankYouRoomId, error: thankYouRoomError } = await supabaseAdmin.rpc('get_or_create_direct_room', {
          user1_id: user_id,
          user2_id: gosats[0].user_id,
        });

        if (!thankYouRoomError && thankYouRoomId) {
          const thankYouRoomIdValue = typeof thankYouRoomId === 'string' 
            ? thankYouRoomId 
            : Array.isArray(thankYouRoomId) 
              ? thankYouRoomId[0] 
              : thankYouRoomId;

          const thankYouMessage = [
            '🙏 Thank You for Your Feedback!',
            '',
            `Dear ${userName},`,
            '',
            'We have received your feedback and truly appreciate you taking the time to share your thoughts with us.',
            '',
            'Your input helps us improve and serve our community better. Our team will review your feedback and get back to you if needed.',
            '',
            'Thank you for being part of our community!',
            '',
            'Blessings,',
            'The S2G Team',
          ].join('\n');

          await supabaseAdmin.rpc('insert_system_chat_message', {
            p_room_id: thankYouRoomIdValue,
            p_content: thankYouMessage,
            p_message_type: 'text',
            p_system_metadata: {
              type: 'feedback_thank_you',
              user_id: user_id,
              is_system: true,
            },
          });

          // Update room timestamp
          await supabaseAdmin
            .from('chat_rooms')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', thankYouRoomIdValue);
        }
      } catch (error) {
        console.error('Error sending thank you message:', error);
      }
    }

    // Also save to user_feedback table
    await supabaseAdmin
      .from('user_feedback')
      .insert({
        user_id: user_id,
        feedback_type: 'help_feedback',
        message: feedback,
        created_at: new Date().toISOString(),
      });

    return new Response(
      JSON.stringify({ success: true, message: 'Feedback submitted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-feedback function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

