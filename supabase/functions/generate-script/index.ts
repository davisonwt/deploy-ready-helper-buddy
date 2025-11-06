import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    console.log('🚀 Script Function started, method:', req.method);
    console.log('📍 Request URL:', req.url);
    console.log('🔍 Headers present:', Object.keys([...req.headers]).join(', '));
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Parsing request body...');
    const requestBody = await req.json();
    const { productDescription, targetAudience, videoLength, style, customPrompt } = requestBody;
    
    // Input validation
    if (!productDescription || typeof productDescription !== 'string' || productDescription.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Product description is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (productDescription.length > 5000) {
      return new Response(JSON.stringify({ error: 'Product description is too long (max 5000 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (customPrompt && typeof customPrompt === 'string' && customPrompt.length > 2000) {
      return new Response(JSON.stringify({ error: 'Custom prompt is too long (max 2000 characters)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (videoLength && (typeof videoLength !== 'number' || videoLength < 15 || videoLength > 300)) {
      return new Response(JSON.stringify({ error: 'Invalid video length (must be between 15-300 seconds)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const allowedStyles = ['professional', 'casual', 'enthusiastic', 'educational', 'storytelling'];
    if (style && !allowedStyles.includes(style)) {
      return new Response(JSON.stringify({ error: 'Invalid style' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('✅ Input validated successfully');

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
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limiting - 10 requests per hour per user
    const rateLimitAllowed = await checkRateLimit(supabase, user.id, 'ai_generation', 10, 60);
    if (!rateLimitAllowed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return createRateLimitResponse(3600);
    }

    // Check daily usage limit
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
        max_completion_tokens: 1000,
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
    const generatedScript = openAIData.choices[0].message.content;

    // Increment usage count - just track that we used the function
    console.log('📊 Recording AI usage...');

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
    console.log('✅ Script generated and saved successfully');

    return new Response(JSON.stringify({ 
      script: generatedScript,
      creation: creation,
      usage: currentUsage || 0,
      limit: dailyLimit
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-script:', error.message, error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred. Please try again later.',
        requestId: crypto.randomUUID()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});