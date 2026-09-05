import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders, validatePaymentAmount } from "../_shared/security.ts";

// Distribution for agent template installs
//  - 85% to template author
//  - 10% tithing (admin wallet)
//  -  5% admin fee   (admin wallet)
const AGENT_DISTRIBUTION = {
  AUTHOR: 0.85,
  TITHING: 0.10,
  ADMIN: 0.05,
};

interface InstallPaymentRequest {
  templateId: string;
  customConfig?: Record<string, unknown>;
  successUrl?: string;
  cancelUrl?: string;
}

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: InstallPaymentRequest = await req.json();
    const { templateId, customConfig = {}, successUrl, cancelUrl } = body;

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: 'templateId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load template
    const { data: template, error: tplError } = await supabase
      .from('agent_templates')
      .select('id, name, author_id, install_bestowal_amount, currency, status')
      .eq('id', templateId)
      .single();

    if (tplError || !template) {
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (template.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Template is not available for install' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amount = Number(template.install_bestowal_amount || 0);
    if (amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'This is a free template - install directly without payment.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amountValidation = validatePaymentAmount(amount);
    if (!amountValidation.valid) {
      return new Response(
        JSON.stringify({ error: amountValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing active install
    const { data: existingInstall } = await supabase
      .from('agent_template_installs')
      .select('id, enabled')
      .eq('template_id', templateId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingInstall?.enabled) {
      return new Response(
        JSON.stringify({ error: 'You already have this agent installed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or reuse a pending install row (enabled=false until payment confirmed)
    let installId: string;
    if (existingInstall) {
      installId = existingInstall.id;
    } else {
      const { data: newInstall, error: instError } = await supabase
        .from('agent_template_installs')
        .insert({
          template_id: templateId,
          user_id: user.id,
          custom_config: customConfig,
          enabled: false,
        })
        .select('id')
        .single();

      if (instError || !newInstall) {
        console.error('❌ Failed to create install:', instError);
        return new Response(
          JSON.stringify({ error: 'Failed to create install record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      installId = newInstall.id;
    }

    // Build NOWPayments invoice
    const orderId = `agent_install_${installId}`;
    const orderDescription = `Agent install: ${template.name}`;

    const origin = req.headers.get('origin') || 'https://sow2growapp.lovable.app';
    const finalSuccessUrl = successUrl || `${origin}/dashboard?section=agents&installed=${installId}`;
    const finalCancelUrl = cancelUrl || `${origin}/dashboard?section=agents&cancelled=${installId}`;
    const ipnCallbackUrl = `${supabaseUrl}/functions/v1/nowpayments-webhook`;

    const invoiceResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': nowpaymentsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: (template.currency || 'USD').toLowerCase(),
        order_id: orderId,
        order_description: orderDescription,
        ipn_callback_url: ipnCallbackUrl,
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        is_fixed_rate: true,
        is_fee_paid_by_user: true,
      }),
    });

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      console.error('❌ NOWPayments API error:', invoiceResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment invoice' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invoiceData = await invoiceResponse.json();

    // Audit log
    await supabase.from('payment_audit_log').insert({
      user_id: user.id,
      action: 'create_agent_install_payment',
      amount,
      currency: template.currency || 'USD',
      status: 'pending',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      metadata: {
        install_id: installId,
        template_id: templateId,
        author_id: template.author_id,
        invoice_id: invoiceData.id,
        distribution: AGENT_DISTRIBUTION,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        installId,
        invoiceId: invoiceData.id,
        invoiceUrl: invoiceData.invoice_url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error creating agent install payment:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create payment' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
