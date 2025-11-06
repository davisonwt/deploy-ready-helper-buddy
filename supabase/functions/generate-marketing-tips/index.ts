import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { checkRateLimit, createRateLimitResponse } from '../_shared/rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productDescription, targetAudience, platform, customPrompt } = await req.json();

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
    const systemPrompt = `You are a digital marketing expert specializing in agricultural and small business marketing. Provide actionable, specific marketing tips that can be implemented immediately. Focus on practical strategies for social media, engagement, and sales conversion.

Guidelines:
- Provide 5-7 specific, actionable tips
- Include platform-specific best practices
- Focus on engagement and conversion strategies
- Mention timing, hashtags, and visual elements
- Include metrics to track success
- Keep advice practical and budget-friendly
- Consider the agricultural/small business context`;

    const userPrompt = customPrompt || `Provide marketing tips for promoting "${productDescription}" to "${targetAudience}" on ${platform || 'social media'}. Include specific strategies for maximum engagement and conversion.`;

    console.log('Generating marketing tips with OpenAI...');
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 1200,
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
    const generatedTips = openAIData.choices[0].message.content;

    // Increment usage count
    await supabase.rpc('increment_ai_usage', { user_id_param: user.id });

    // Save to database
    const { data: creation, error: dbError } = await supabase
      .from('ai_creations')
      .insert({
        user_id: user.id,
        content_type: 'marketing_tip',
        title: `Marketing Tips: ${productDescription.substring(0, 40)}...`,
        content_text: generatedTips,
        product_description: productDescription,
        target_audience: targetAudience,
        custom_prompt: customPrompt,
        metadata: {
          platform: platform,
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

    console.log('Marketing tips generated successfully');

    return new Response(JSON.stringify({ 
      tips: generatedTips,
      creation: creation,
      usage: usageData + 1,
      limit: dailyLimit
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-marketing-tips:', error.message, error.stack);
    return new Response(JSON.stringify({ 
      error: 'An error occurred. Please try again later.',
      requestId: crypto.randomUUID()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});