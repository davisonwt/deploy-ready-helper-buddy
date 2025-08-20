import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface ShiftReminderRequest {
  scheduleId?: string;
  reminderType: 'immediate' | '24h' | '1h';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Shift reminder function called');
    
    const { scheduleId, reminderType }: ShiftReminderRequest = await req.json();

    let upcomingShifts;

    if (scheduleId) {
      // Send reminder for specific shift
      const { data, error } = await supabase
        .from('radio_schedule')
        .select(`
          *,
          radio_shows (show_name, description, subject, topic_description),
          radio_djs (dj_name, user_id, avatar_url)
        `)
        .eq('id', scheduleId)
        .eq('approval_status', 'approved')
        .single();

      if (error) throw error;
      upcomingShifts = data ? [data] : [];
    } else {
      // Send reminders based on time criteria
      const now = new Date();
      let startTime, endTime;

      switch (reminderType) {
        case '24h':
          startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000 - 30 * 60 * 1000); // 24h - 30min
          endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000); // 24h + 30min
          break;
        case '1h':
          startTime = new Date(now.getTime() + 60 * 60 * 1000 - 15 * 60 * 1000); // 1h - 15min
          endTime = new Date(now.getTime() + 60 * 60 * 1000 + 15 * 60 * 1000); // 1h + 15min
          break;
        default:
          startTime = now;
          endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Next 2 hours
      }

      const { data, error } = await supabase
        .from('radio_schedule')
        .select(`
          *,
          radio_shows (show_name, description, subject, topic_description),
          radio_djs (dj_name, user_id, avatar_url)
        `)
        .eq('approval_status', 'approved')
        .gte('start_time', startTime.toISOString())
        .lte('start_time', endTime.toISOString());

      if (error) throw error;
      upcomingShifts = data || [];
    }

    console.log(`Found ${upcomingShifts.length} upcoming shifts for ${reminderType} reminders`);

    const results = [];

    for (const shift of upcomingShifts) {
      if (!shift.radio_djs?.user_id) continue;

      // Create or get direct message room with the DJ
      const { data: roomData, error: roomError } = await supabase.rpc('get_or_create_direct_room', {
        user1_id: 'system', // We'll use a system user ID or admin ID
        user2_id: shift.radio_djs.user_id
      });

      if (roomError) {
        console.error('Error creating/getting room:', roomError);
        continue;
      }

      const shiftTime = new Date(shift.start_time);
      const timeUntilShift = Math.round((shiftTime.getTime() - Date.now()) / (1000 * 60 * 60));
      
      let messageTitle, messageContent;
      
      switch (reminderType) {
        case '24h':
          messageTitle = "🎙️ Radio Shift Reminder - 24 Hours";
          messageContent = `Hi ${shift.radio_djs.dj_name}! This is a friendly reminder that you have a radio show scheduled for tomorrow.\n\n**Show Details:**\n• **Show:** ${shift.radio_shows?.show_name || 'Your Show'}\n• **Time:** ${shiftTime.toLocaleString()}\n• **Subject:** ${shift.radio_shows?.subject || 'General Broadcasting'}\n• **Topic:** ${shift.radio_shows?.topic_description || 'Live radio broadcasting'}\n\nPlease make sure you're prepared and ready to go live! 🎵`;
          break;
        case '1h':
          messageTitle = "⏰ Radio Shift Starting Soon - 1 Hour";
          messageContent = `${shift.radio_djs.dj_name}, your radio show starts in about 1 hour!\n\n**Show:** ${shift.radio_shows?.show_name || 'Your Show'}\n**Start Time:** ${shiftTime.toLocaleString()}\n\nPlease log into Grove Station and prepare for your show. Break a leg! 🎤`;
          break;
        default:
          messageTitle = "📻 Radio Shift Assignment Confirmed";
          messageContent = `Hello ${shift.radio_djs.dj_name}! You've been assigned to host a radio show on Grove Station.\n\n**Show Details:**\n• **Show:** ${shift.radio_shows?.show_name || 'Your Show'}\n• **Time:** ${shiftTime.toLocaleString()}\n• **Subject:** ${shift.radio_shows?.subject || 'General Broadcasting'}\n• **Duration:** 2 hours\n\nWe're excited to have you on air! Please prepare your content and be ready to go live. 🎵`;
      }

      // Send message to the chat room
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomData,
          sender_id: '326d0cdb-f8cf-4b09-8ce6-f95d4e49b9a1', // System/Admin user ID
          message_type: 'text',
          content: messageContent,
          is_system_message: true
        });

      if (messageError) {
        console.error('Error sending message:', messageError);
        results.push({ 
          shiftId: shift.id, 
          djName: shift.radio_djs.dj_name,
          success: false, 
          error: messageError.message 
        });
      } else {
        console.log(`Reminder sent to ${shift.radio_djs.dj_name} for shift at ${shiftTime}`);
        results.push({ 
          shiftId: shift.id, 
          djName: shift.radio_djs.dj_name,
          success: true 
        });
      }

      // Also create a user notification
      await supabase
        .from('user_notifications')
        .insert({
          user_id: shift.radio_djs.user_id,
          type: 'radio_shift_reminder',
          title: messageTitle,
          message: messageContent,
          action_url: '/grove-station'
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${upcomingShifts.length} shifts`,
        results 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in send-shift-reminders function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);