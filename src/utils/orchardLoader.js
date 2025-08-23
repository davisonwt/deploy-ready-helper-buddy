import { supabase } from "@/integrations/supabase/client";

// Simple orchard loader that returns actual database data
const orchardCache = new Map();

// Helper function to convert signed URLs to public URLs
function convertToPublicUrl(url) {
  if (!url) return url;
  
  // Check if it's already a public URL
  if (url.includes('/object/public/')) {
    return url;
  }
  
  // Convert signed URL to public URL
  if (url.includes('/object/sign/')) {
    const baseUrl = url.split('/object/sign/')[0];
    const pathPart = url.split('/object/sign/')[1];
    const cleanPath = pathPart.split('?token=')[0]; // Remove token
    return `${baseUrl}/object/public/${cleanPath}`;
  }
  
  return url;
}

export async function loadOrchard(orchardId) {
  console.log(`🔍 Loading orchard: ${orchardId}`);
  
  // Check cache first
  if (orchardCache.has(orchardId)) {
    const cached = orchardCache.get(orchardId);
    console.log(`💾 Cache hit for orchard: ${orchardId}`);
    return cached;
  }

  try {
    console.log(`📡 Fetching orchard ${orchardId} from Supabase`);

    const { data, error } = await supabase
      .from('orchards')
      .select(`*`)
      .eq('id', orchardId)
      .single();

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!data) {
      throw new Error('Orchard not found');
    }

    // Convert all media URLs to public URLs since buckets are now public
    const processedData = {
      ...data,
      images: data.images ? data.images.map(convertToPublicUrl) : [],
      video_url: convertToPublicUrl(data.video_url)
    };

    console.log(`✅ Orchard loaded successfully: ${processedData.title}`);
    console.log(`🔗 Converted URLs to public access`);
    
    // Cache for 5 minutes
    orchardCache.set(orchardId, processedData);
    setTimeout(() => {
      orchardCache.delete(orchardId);
    }, 300000);

    return processedData;

  } catch (error) {
    console.error(`💥 Failed to load orchard ${orchardId}:`, error);
    throw error;
  }
}

// Clear cache utility
export function clearOrchardCache(orchardId) {
  if (orchardId) {
    orchardCache.delete(orchardId);
    console.log(`🗑️ Cache cleared for orchard: ${orchardId}`);
  } else {
    orchardCache.clear();
    console.log('🗑️ All orchard cache cleared');
  }
}

// Make utilities available globally for debugging
if (typeof window !== 'undefined') {
  window.__orchardLoader = {
    load: loadOrchard,
    clear: clearOrchardCache,
  };
  
  console.log('🛠️ OrchardLoader: Bulletproof utility ready with Supabase');
}