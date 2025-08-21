// Cookie and CORS Configuration for Supabase Storage
export const configureCookiePolicy = () => {
  // Prevent third-party cookie issues with Supabase storage
  if (typeof document !== 'undefined') {
    // Add SameSite policy to prevent cross-origin cookie issues
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🍪 Configuring cookie policy for Supabase storage...');
      
      // Override default cookie behavior for video elements
      const videos = document.querySelectorAll('video');
      videos.forEach(video => {
        // Add crossorigin attribute to prevent cookie domain conflicts
        if (!video.hasAttribute('crossorigin')) {
          video.setAttribute('crossorigin', 'anonymous');
        }
      });
    });
  }
};

// Call configuration
configureCookiePolicy();