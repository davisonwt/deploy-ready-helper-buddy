import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { generation_id, prompt } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limiting
    const { data: usageData } = await supabase.rpc('get_ai_usage_today', { user_id_param: user.id });
    const dailyLimit = 3; // Video generation is more expensive
    
    if (usageData >= dailyLimit) {
      return new Response(JSON.stringify({ 
        error: 'Daily video generation limit reached. Upgrade to premium for more videos.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating video with Replicate API...');
    
    // Use Replicate for video generation (example with a text-to-video model)
    const replicateApiKey = Deno.env.get('REPLICATE_API_TOKEN');
    if (!replicateApiKey) {
      console.error('Replicate API key not found');
      return new Response(JSON.stringify({ error: 'Video generation service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update generation status to processing
    await supabase
      .from('ai_creations')
      .update({ 
        metadata: { status: 'processing', started_at: new Date().toISOString() }
      })
      .eq('id', generation_id);

    // Create Replicate prediction
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "9ca635f7ba4c7a8a5bc85fb1d4cd6a7b6396d6b257b31e8fd346dbe5a48ca9d9", // Example video model
        input: {
          prompt: prompt,
          num_frames: 24,
          fps: 8,
          width: 512,
          height: 512
        }
      }),
    });

    if (!replicateResponse.ok) {
      const error = await replicateResponse.text();
      console.error('Replicate API error:', error);
      
      // Update generation status to failed
      await supabase
        .from('ai_creations')
        .update({ 
          metadata: { status: 'failed', error: 'Video generation service error' }
        })
        .eq('id', generation_id);

      return new Response(JSON.stringify({ error: 'Failed to start video generation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prediction = await replicateResponse.json();

    // Poll for completion (in production, use webhooks)
    const pollCompletion = async () => {
      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${replicateApiKey}`,
        },
      });

      if (statusResponse.ok) {
        const result = await statusResponse.json();
        
        if (result.status === 'succeeded' && result.output) {
          // Update database with completed video
          await supabase
            .from('ai_creations')
            .update({ 
              metadata: { 
                status: 'completed', 
                video_url: result.output[0] || result.output,
                completed_at: new Date().toISOString(),
                prediction_id: prediction.id
              }
            })
            .eq('id', generation_id);

          // Increment usage count
          await supabase.rpc('increment_ai_usage', { user_id_param: user.id });
          
        } else if (result.status === 'failed') {
          await supabase
            .from('ai_creations')
            .update({ 
              metadata: { 
                status: 'failed', 
                error: result.error || 'Video generation failed',
                failed_at: new Date().toISOString()
              }
            })
            .eq('id', generation_id);
        }
      }
    };

    // Start polling (in production, use webhooks for better performance)
    setTimeout(pollCompletion, 10000); // Check after 10 seconds
    setTimeout(pollCompletion, 30000); // Check after 30 seconds
    setTimeout(pollCompletion, 60000); // Check after 1 minute

    console.log('Video generation started successfully');

    return new Response(JSON.stringify({ 
      success: true,
      prediction_id: prediction.id,
      message: 'Video generation started. This may take a few minutes.',
      generation_id: generation_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-video function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});