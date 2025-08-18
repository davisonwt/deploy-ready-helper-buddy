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
    const { productDescription, targetAudience, videoLength, style, customPrompt } = await req.json();

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
    const dailyLimit = 10; // Free tier limit
    
    if (usageData >= dailyLimit) {
      return new Response(JSON.stringify({ 
        error: 'Daily generation limit reached. Upgrade to premium for unlimited access.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construct AI prompt
    const systemPrompt = `You are a marketing expert specializing in agriculture and small businesses. Generate engaging, concise video scripts for social media promotion. Focus on authentic storytelling, value proposition, and clear calls to action.

Guidelines:
- Scripts should be conversational and authentic
- Include specific shot suggestions (e.g., "Show product close-up")
- Add voice-over timing hints
- Focus on benefits, not just features
- Include emotional hooks and clear CTAs
- Keep language simple and relatable
- Add suggestions for visual elements`;

    const userPrompt = customPrompt || `Create a ${videoLength}-second video script for promoting "${productDescription}". 
Target audience: ${targetAudience}. 
Style: ${style}.
Include voice-over lines, shot suggestions, and engagement tips.`;

    console.log('Generating script with OpenAI...');
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      console.error('OpenAI API error:', error);
      return new Response(JSON.stringify({ error: 'Failed to generate script. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    const generatedScript = openAIData.choices[0].message.content;

    // Increment usage count
    await supabase.rpc('increment_ai_usage', { user_id_param: user.id });

    // Save to database
    const { data: creation, error: dbError } = await supabase
      .from('ai_creations')
      .insert({
        user_id: user.id,
        content_type: 'script',
        title: `Script: ${productDescription.substring(0, 50)}...`,
        content_text: generatedScript,
        product_description: productDescription,
        target_audience: targetAudience,
        video_length: videoLength,
        style: style,
        custom_prompt: customPrompt,
        metadata: {
          generated_at: new Date().toISOString(),
          model: 'gpt-4o',
          prompt_tokens: openAIData.usage?.prompt_tokens,
          completion_tokens: openAIData.usage?.completion_tokens
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to save script' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Script generated successfully');

    return new Response(JSON.stringify({ 
      script: generatedScript,
      creation: creation,
      usage: usageData + 1,
      limit: dailyLimit
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-script function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});