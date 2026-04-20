// tribal-hearts-onboard — turns 10–15 onboarding answers into a structured profile draft via Lovable AI
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-my-custom-header, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function buildFallbackDraft(answers: Array<{ question_key: string; question_text: string; answer: string }>) {
  const answerMap = Object.fromEntries(answers.map((item) => [item.question_key, item.answer.trim()]));
  const firstName = answerMap.first_name || 'This member';
  const values = [answerMap.faith, answerMap.family_goals, answerMap.values]
    .flatMap((value) => (value || '').split(/[,.]/))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);
  const interests = [answerMap.interests, answerMap.hobbies, answerMap.activity_level]
    .flatMap((value) => (value || '').split(/[,.]/))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 5);

  const bioParts = [
    `${firstName} is here to build a meaningful, faith-friendly connection rooted in sincerity and care.`,
    answerMap.values ? `They value ${answerMap.values.trim()}.` : '',
    answerMap.interests ? `They enjoy ${answerMap.interests.trim()}.` : '',
    answerMap.family_goals ? `Their hopes for the future include ${answerMap.family_goals.trim()}.` : '',
  ].filter(Boolean);

  return {
    bio: bioParts.join(' ').slice(0, 420),
    values: values.length ? values : ['faith', 'kindness', 'family'],
    interests: interests.length ? interests : ['community', 'conversation'],
    lifestyle: {
      faith: answerMap.faith || 'Faith matters deeply in daily life.',
      family_goals: answerMap.family_goals || 'Open to building a committed future together.',
      activity_level: answerMap.activity_level || 'Balanced',
      diet: answerMap.diet || 'Not specified',
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const auth = req.headers.get('Authorization') || '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { answers } = await req.json() as { answers: Array<{ question_key: string; question_text: string; answer: string }> };
    if (!Array.isArray(answers) || answers.length < 5) {
      return new Response(JSON.stringify({ error: 'need at least 5 answers' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const cleanedAnswers = answers
      .map((answer) => ({
        ...answer,
        question_key: answer.question_key?.trim(),
        question_text: answer.question_text?.trim(),
        answer: answer.answer?.trim(),
      }))
      .filter((answer) => answer.question_key && answer.question_text && answer.answer);

    if (cleanedAnswers.length < 5) {
      return new Response(JSON.stringify({ error: 'need at least 5 complete answers' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { error: persistError } = await supabase.from('tribal_hearts_answers').upsert(
      cleanedAnswers.map((a) => ({ user_id: user.id, ...a })),
      { onConflict: 'user_id,question_key' }
    );
    if (persistError) throw persistError;

    let draft = buildFallbackDraft(cleanedAnswers);

    if (LOVABLE_API_KEY) {
      try {
        const sys = `You are Gentoo, a warm, respectful guide for the Sow2Grow Tribal Hearts dating garden.
Draft a sincere, attractive, family-friendly profile from the member's answers.
Tone: warm, hopeful, faith-friendly, never crude. Keep bio 80–140 words.`;
        const userMsg = `Answers from the member:\n${cleanedAnswers.map(a => `Q: ${a.question_text}\nA: ${a.answer}`).join('\n\n')}`;

        const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [{ role: 'system', content: sys }, { role: 'user', content: userMsg }],
            tools: [{
              type: 'function',
              function: {
                name: 'draft_profile',
                description: 'Draft a Tribal Hearts profile.',
                parameters: {
                  type: 'object',
                  properties: {
                    bio: { type: 'string' },
                    values: { type: 'array', items: { type: 'string' } },
                    interests: { type: 'array', items: { type: 'string' } },
                    lifestyle: {
                      type: 'object',
                      properties: {
                        faith: { type: 'string' },
                        family_goals: { type: 'string' },
                        activity_level: { type: 'string' },
                        diet: { type: 'string' },
                      },
                    },
                  },
                  required: ['bio', 'values', 'interests', 'lifestyle'],
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'draft_profile' } },
          }),
        });

        if (aiResp.ok) {
          const data = await aiResp.json();
          const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          const aiDraft = args ? JSON.parse(args) : null;
          if (aiDraft?.bio && Array.isArray(aiDraft?.values) && Array.isArray(aiDraft?.interests) && aiDraft?.lifestyle) {
            draft = aiDraft;
          }
        } else {
          console.warn('tribal-hearts-onboard AI unavailable, using fallback draft', aiResp.status);
        }
      } catch (aiError) {
        console.error('tribal-hearts-onboard fallback triggered', aiError);
      }
    } else {
      console.warn('tribal-hearts-onboard LOVABLE_API_KEY missing, using fallback draft');
    }

    return new Response(JSON.stringify({ draft }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('hearts-onboard', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
