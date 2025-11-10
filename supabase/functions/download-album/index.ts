import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const productId = url.searchParams.get('product_id');
    
    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Missing product_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch product and verify user has access (purchased or owns it)
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('id, title, file_url, license_type, sower_id, sowers(user_id)')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user owns the product or it's free
    const isOwner = product.sowers?.user_id === user.id;
    const isFree = product.license_type === 'free';

    if (!isFree && !isOwner) {
      // Check if user purchased it
      const { data: purchase } = await supabaseClient
        .from('music_purchases')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .single();

      if (!purchase) {
        return new Response(
          JSON.stringify({ error: 'Access denied - product not purchased' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch manifest from storage
    const manifestResponse = await fetch(product.file_url);
    if (!manifestResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch album manifest' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const manifest = await manifestResponse.json();

    // Validate manifest structure
    if (!manifest.tracks || !Array.isArray(manifest.tracks)) {
      return new Response(
        JSON.stringify({ error: 'Invalid album manifest' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Streaming album with ${manifest.tracks.length} tracks`);

    // Import JSZip dynamically
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    const zip = new JSZip();

    // Download and add each track to ZIP
    for (const track of manifest.tracks) {
      try {
        console.log(`Fetching track: ${track.name}`);
        const trackResponse = await fetch(track.url);
        
        if (!trackResponse.ok) {
          console.error(`Failed to fetch track ${track.name}: ${trackResponse.statusText}`);
          continue;
        }

        const trackBlob = await trackResponse.blob();
        zip.file(track.name, trackBlob);
      } catch (error) {
        console.error(`Error processing track ${track.name}:`, error);
        // Continue with other tracks
      }
    }

    // Generate ZIP
    console.log('Generating ZIP file...');
    const zipBlob = await zip.generateAsync({ 
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const filename = `${product.title.replace(/[^a-z0-9]/gi, '_')}_album.zip`;

    return new Response(zipBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': zipBlob.length.toString(),
      },
    });

  } catch (error) {
    console.error('Album download error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
