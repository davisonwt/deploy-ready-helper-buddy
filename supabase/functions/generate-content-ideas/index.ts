import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 Function started, method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Parsing request body...');
    const { productDescription, targetAudience, contentType, customPrompt } = await req.json();
    console.log('✅ Request body parsed successfully');

    // Initialize Supabase client
    console.log('🔧 Initializing Supabase client...');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');

    // Get user from auth header
    console.log('🔐 Checking authentication...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('❌ No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limiting - 10 requests per hour
    const rateLimitAllowed = await checkRateLimit(supabase, user.id, 'ai_generation', 10, 60);
    if (!rateLimitAllowed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return createRateLimitResponse(3600);
    }

    // Check daily usage
    const { data: usageData } = await supabase.rpc('get_ai_usage_today', { user_id_param: user.id });
    const dailyLimit = 10;
    
    if (usageData >= dailyLimit) {
      return new Response(JSON.stringify({ 
        error: 'Daily generation limit reached. Please try again tomorrow.' 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construct AI prompt
    const systemPrompt = `You are a creative content strategist specializing in agricultural and small business marketing. Generate diverse, engaging content ideas that can be executed across different platforms and formats.

Guidelines:
- Provide 8-10 varied content ideas
- Include different content formats (videos, posts, stories, reels, etc.)
- Suggest seasonal and trending angles
- Include educational and entertaining content
- Consider different stages of the customer journey
- Provide specific execution ideas for each concept
- Keep ideas practical and budget-friendly
- Include suggested hashtags and captions where relevant`;

    const userPrompt = customPrompt || `Generate creative content ideas for promoting "${productDescription}" to "${targetAudience}". 
Content type focus: ${contentType || 'mixed content (videos, posts, stories)'}.
Include various formats and creative angles that would engage the target audience.`;

    console.log('Generating content ideas with OpenAI...');
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment variables');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured. Please contact support.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 1500,
        // Note: temperature not supported for gpt-5 (defaults to 1.0)
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, error);
      return new Response(JSON.stringify({ error: 'Unable to generate content. Please try again later.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIData = await openAIResponse.json();
    const generatedIdeas = openAIData.choices[0].message.content;

    // Record usage tracking - this creation counts as usage
    console.log('📊 Recording AI usage...');

    // Save to database
    const { data: creation, error: dbError } = await supabase
      .from('ai_creations')
      .insert({
        user_id: user.id,
        content_type: 'content_idea',
        title: `Content Ideas: ${productDescription.substring(0, 40)}...`,
        content_text: generatedIdeas,
        product_description: productDescription,
        target_audience: targetAudience,
        custom_prompt: customPrompt,
        metadata: {
          content_type_focus: contentType,
          generated_at: new Date().toISOString(),
          model: 'gpt-5-2025-08-07',
          prompt_tokens: openAIData.usage?.prompt_tokens,
          completion_tokens: openAIData.usage?.completion_tokens
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError.message, dbError.code);
      return new Response(JSON.stringify({ error: 'Unable to save content. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current usage for response  
    const { data: currentUsage } = await supabase.rpc('get_ai_usage_today', { user_id_param: user.id });
    console.log('✅ Content ideas generated and saved successfully');

    return new Response(JSON.stringify({ 
      ideas: generatedIdeas,
      creation: creation,
      usage: currentUsage || 0,
      limit: dailyLimit
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-content-ideas:', error.message, error.stack);
    return new Response(JSON.stringify({ 
      error: 'An error occurred. Please try again later.',
      requestId: crypto.randomUUID()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});