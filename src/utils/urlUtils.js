// Utility functions for handling URLs, especially for converting Supabase storage URLs

/**
 * Converts signed URLs to public URLs for Supabase storage
 * @param {string} url - The URL to convert
 * @returns {string} - The converted public URL or original URL if no conversion needed
 */
export function convertToPublicUrl(url) {
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

/**
 * Processes orchard data to convert all media URLs to public URLs
 * @param {Object} orchard - The orchard object
 * @returns {Object} - The orchard object with converted URLs
 */
export function processOrchardUrls(orchard) {
  if (!orchard) return orchard;
  
  return {
    ...orchard,
    images: orchard.images ? orchard.images.map(convertToPublicUrl) : [],
    video_url: convertToPublicUrl(orchard.video_url)
  };
}

/**
 * Processes an array of orchards to convert all media URLs to public URLs
 * @param {Array} orchards - Array of orchard objects
 * @returns {Array} - Array of orchard objects with converted URLs
 */
export function processOrchardsUrls(orchards) {
  if (!Array.isArray(orchards)) return orchards;
  
  return orchards.map(processOrchardUrls);
}