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
    const { productDescription, style, customPrompt, confirmed } = await req.json();

    // Ask for user confirmation before generating images
    if (!confirmed) {
      return new Response(JSON.stringify({ 
        requiresConfirmation: true,
        message: 'Image generation will use additional AI credits. Do you want to proceed?'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Check rate limiting (images count as 2 generations)
    const { data: usageData } = await supabase.rpc('get_ai_usage_today', { user_id_param: user.id });
    const dailyLimit = 10;
    
    if (usageData >= dailyLimit - 1) {
      return new Response(JSON.stringify({ 
        error: 'Daily generation limit reached. Upgrade to premium for unlimited access.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construct image prompt
    const imagePrompt = customPrompt || 
      `Create a vibrant, eye-catching thumbnail image for "${productDescription}". 
       Style: ${style}. 
       Features: High contrast, bright colors, clear focal point, no text overlay needed.
       Context: Agricultural/farming theme, authentic and appealing for social media.
       Aspect ratio: 16:9 for video thumbnail.`;

    console.log('Generating thumbnail with OpenAI DALL-E...');
    
    const openAIResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
        style: 'natural'
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      console.error('OpenAI API error:', error);
      return new Response(JSON.stringify({ error: 'Failed to generate thumbnail. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    const imageUrl = openAIData.data[0].url;

    // Increment usage count (images count as 2)
    await supabase.rpc('increment_ai_usage', { user_id_param: user.id });
    await supabase.rpc('increment_ai_usage', { user_id_param: user.id });

    // Save to database
    const { data: creation, error: dbError } = await supabase
      .from('ai_creations')
      .insert({
        user_id: user.id,
        content_type: 'thumbnail',
        title: `Thumbnail: ${productDescription.substring(0, 40)}...`,
        image_url: imageUrl,
        product_description: productDescription,
        style: style,
        custom_prompt: customPrompt,
        metadata: {
          generated_at: new Date().toISOString(),
          model: 'dall-e-3',
          size: '1792x1024',
          quality: 'standard',
          revised_prompt: openAIData.data[0].revised_prompt
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to save thumbnail' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Thumbnail generated successfully');

    return new Response(JSON.stringify({ 
      imageUrl: imageUrl,
      creation: creation,
      usage: usageData + 2,
      limit: dailyLimit
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-thumbnail function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});