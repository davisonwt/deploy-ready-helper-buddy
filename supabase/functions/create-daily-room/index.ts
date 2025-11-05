import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    const { roomName, userId } = await req.json();
    
    console.log('Creating Daily room:', { roomName, userId });

    // Create a room
    const createRoomResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          enable_chat: false,
          enable_screenshare: false,
          enable_recording: 'cloud',
          start_audio_off: false,
          start_video_off: true,
          max_participants: 2,
        },
      }),
    });

    if (!createRoomResponse.ok) {
      const errorText = await createRoomResponse.text();
      console.error('Daily room creation failed:', errorText);
      throw new Error(`Failed to create room: ${errorText}`);
    }

    const room = await createRoomResponse.json();
    console.log('Room created:', room.url);

    // Create a meeting token for this user
    const tokenResponse = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userId,
          is_owner: true,
        },
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Daily token creation failed:', errorText);
      throw new Error(`Failed to create token: ${errorText}`);
    }

    const { token } = await tokenResponse.json();
    console.log('Token created for user:', userId);

    return new Response(
      JSON.stringify({ 
        roomUrl: room.url,
        token,
        roomName: room.name,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-daily-room:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
