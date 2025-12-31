import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting weekly playlist generation...');

    // Calculate the week that just ended (previous week)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const sunriseMinutes = 5 * 60 + 13; // 05:13
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    
    // Adjust for sunrise-based day
    let effectiveDate = now;
    if (currentTimeMinutes < sunriseMinutes) {
      effectiveDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Calculate days since epoch (March 20, 2025)
    const epochDate = new Date(2025, 2, 20); // March 20, 2025
    const daysSinceEpoch = Math.floor((effectiveDate.getTime() - epochDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Calculate year and week
    const year = 6028 + Math.floor(daysSinceEpoch / 364);
    let weekNum = Math.floor((daysSinceEpoch % 364) / 7) + 1;
    if (weekNum > 52) weekNum = 52;
    if (weekNum < 1) weekNum = 1;

    // The week we're finalizing is the previous week
    let finalizeYear = year;
    let finalizeWeek = weekNum - 1;
    if (finalizeWeek < 1) {
      finalizeWeek = 52;
      finalizeYear = year - 1;
    }

    const weekId = `${finalizeYear}_${String(finalizeWeek).padStart(2, '0')}`;
    console.log(`Generating playlist for week: ${weekId}`);

    // Check if playlist already exists for this week
    const { data: existingPlaylist } = await supabase
      .from('weekly_playlists')
      .select('id')
      .eq('week_id', weekId)
      .single();

    if (existingPlaylist) {
      console.log(`Playlist already exists for week ${weekId}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Playlist already exists',
        weekId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get top 10 songs by vote count for this week
    const { data: topSongs, error: votesError } = await supabase
      .from('song_votes')
      .select(`
        song_id,
        dj_music_tracks!inner(id, track_title, artist_name)
      `)
      .eq('week_id', weekId);

    if (votesError) {
      console.error('Error fetching votes:', votesError);
      throw votesError;
    }

    // Count votes per song
    const voteCounts: Record<string, { count: number; title: string; artist: string }> = {};
    topSongs?.forEach((vote: any) => {
      const songId = vote.song_id;
      if (!voteCounts[songId]) {
        voteCounts[songId] = {
          count: 0,
          title: vote.dj_music_tracks.track_title,
          artist: vote.dj_music_tracks.artist_name,
        };
      }
      voteCounts[songId].count++;
    });

    // Sort by vote count and take top 10
    const sortedSongs = Object.entries(voteCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10);

    if (sortedSongs.length === 0) {
      console.log(`No votes found for week ${weekId}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No votes to process',
        weekId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build rank data and song IDs array
    const rankData = sortedSongs.map(([songId, data], index) => ({
      song_id: songId,
      vote_count: data.count,
      rank: index + 1,
      title: data.title,
      artist: data.artist,
    }));

    const songIds = sortedSongs.map(([songId]) => songId);

    // Get total unique voters
    const { data: voterData } = await supabase
      .from('song_votes')
      .select('user_id')
      .eq('week_id', weekId);
    
    const uniqueVoters = new Set(voterData?.map(v => v.user_id) || []);
    const totalVotes = topSongs?.length || 0;

    // Create the weekly playlist
    const playlistTitle = `364ttt Week ${finalizeWeek} – Year ${finalizeYear}`;
    
    const { data: newPlaylist, error: insertError } = await supabase
      .from('weekly_playlists')
      .insert({
        week_id: weekId,
        title: playlistTitle,
        song_ids: songIds,
        rank_data: rankData,
        total_votes: totalVotes,
        total_voters: uniqueVoters.size,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating playlist:', insertError);
      throw insertError;
    }

    console.log(`Created playlist: ${playlistTitle} with ${songIds.length} songs`);

    // Send notifications to voters about the new album
    const { data: voters } = await supabase
      .from('song_votes')
      .select('user_id')
      .eq('week_id', weekId);

    const uniqueVoterIds = [...new Set(voters?.map(v => v.user_id) || [])];

    // Create notifications for all voters
    if (uniqueVoterIds.length > 0) {
      const notifications = uniqueVoterIds.map(userId => ({
        user_id: userId,
        type: '364ttt_album_released',
        title: '🎵 New 364ttt Album Released!',
        message: `${playlistTitle} is now available! Check out the top 10 Torah songs of the week.`,
        action_url: `/364ttt/album/${weekId}`,
      }));

      await supabase.from('user_notifications').insert(notifications);
      console.log(`Sent notifications to ${uniqueVoterIds.length} voters`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      playlist: newPlaylist,
      message: `Generated ${playlistTitle}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating weekly playlist:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
