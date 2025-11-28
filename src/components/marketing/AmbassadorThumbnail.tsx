import React, { useState, useEffect } from 'react';
import { getCurrentTheme } from '@/utils/dashboardThemes';

export function AmbassadorThumbnail() {
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());

  // Update theme every 2 hours
  useEffect(() => {
    const themeInterval = setInterval(() => {
      setCurrentTheme(getCurrentTheme());
    }, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(themeInterval);
  }, []);

  return (
    <div className="relative w-full aspect-video overflow-hidden" style={{ background: currentTheme.background }}>
      {/* Cosmic Space Background */}
      <div className="absolute inset-0">
        {/* Stars */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,215,0,0.3) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(255,215,0,0.2) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,215,0,0.25) 1px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,215,0,0.2) 1px, transparent 1px)',
          backgroundSize: '30% 30%, 25% 25%, 35% 35%, 28% 28%',
          backgroundPosition: '0% 0%, 100% 100%, 50% 50%, 0% 100%',
        }} />
        
        {/* Glowing Golden Particles */}
        <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-amber-400 rounded-full blur-sm animate-pulse" style={{ boxShadow: '0 0 20px rgba(255,215,0,0.6)' }} />
        <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-amber-300 rounded-full blur-sm animate-pulse" style={{ animationDelay: '0.5s', boxShadow: '0 0 15px rgba(255,215,0,0.5)' }} />
        <div className="absolute bottom-1/3 left-1/2 w-1 h-1 bg-amber-500 rounded-full blur-sm animate-pulse" style={{ animationDelay: '1s', boxShadow: '0 0 10px rgba(255,215,0,0.4)' }} />
      </div>

      {/* Top-left Logo */}
      <div className="absolute top-6 left-6 z-20">
        <div className="text-4xl font-bold" style={{
          color: currentTheme.accent,
          textShadow: `0 0 20px ${currentTheme.accent}80, 0 0 40px ${currentTheme.accent}40`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '2px'
        }}>
          2SG
        </div>
        <div className="text-xs mt-1" style={{ 
          color: currentTheme.accentLight,
          textShadow: `0 0 10px ${currentTheme.accent}50` 
        }}>2SGApp</div>
      </div>

      {/* Center Card */}
      <div className="absolute inset-0 flex items-center justify-center z-10 px-8">
        <div className="backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-4xl w-full border" style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.cardBorder,
          boxShadow: `0 25px 50px -12px ${currentTheme.shadow}, 0 0 0 1px ${currentTheme.cardBorder}`
        }}>
          {/* Title */}
          <h1 className="text-4xl font-bold mb-2 text-center" style={{
            color: currentTheme.textPrimary,
            textShadow: `0 2px 4px ${currentTheme.shadow}`
          }}>
            Become a 2SG Ambassador
          </h1>
          
          {/* Subtitle */}
          <p className="text-sm text-center mb-6 font-light tracking-wide" style={{ color: currentTheme.textSecondary }}>
            Sowers • Growers • Bestowers • Whisperers • Guardians • Harvesters
          </p>

          {/* Application Form */}
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>Full Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Enter your full name"
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Current 2SG Role */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>Current 2SG Role</label>
              <select 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option>Sower</option>
                <option>Grower</option>
                <option>Bestower</option>
                <option>Whisperer</option>
                <option>Guardian</option>
                <option>Harvester</option>
                <option>Other</option>
              </select>
            </div>

            {/* Desired Username */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>Desired Username</label>
              <div className="flex items-center">
                <span 
                  className="px-4 py-2 border border-r-0 rounded-l-lg font-mono"
                  style={{
                    backgroundColor: currentTheme.secondaryButton,
                    borderColor: currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                  }}
                >s2g@</span>
                <input 
                  type="text" 
                  className="flex-1 px-4 py-2 border rounded-r-lg focus:ring-2 focus:border-transparent"
                  placeholder="gosatqueen"
                  style={{
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.cardBorder;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Platform Checkboxes */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: currentTheme.textPrimary }}>Platforms</label>
              <div className="grid grid-cols-5 gap-2">
                {['TikTok', 'YouTube', 'Instagram', 'Facebook', 'Twitter/X', 'Discord', 'Snapchat', 'Reddit', 'Telegram', 'WhatsApp'].map((platform) => (
                  <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded"
                      style={{
                        accentColor: currentTheme.accent,
                        borderColor: currentTheme.cardBorder,
                      }}
                    />
                    <span className="text-xs" style={{ color: currentTheme.textPrimary }}>{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Business/Ministry/Brand Name */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                Business / Ministry / Personal Brand Name <span className="font-normal" style={{ color: currentTheme.textSecondary }}>(optional)</span>
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent"
                placeholder="Enter your brand name"
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Why I want to represent 2SG */}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>Why I want to represent 2SG</label>
              <textarea 
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent resize-none"
                placeholder="Tell us about your passion for the 2SG community..."
                style={{
                  backgroundColor: currentTheme.cardBg,
                  borderColor: currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.accent}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Submit Button */}
            <button 
              className="w-full py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              style={{
                background: currentTheme.primaryButton,
                color: currentTheme.textPrimary,
                boxShadow: `0 10px 25px -5px ${currentTheme.shadow}`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = currentTheme.primaryButtonHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = currentTheme.primaryButton;
              }}
            >
              Submit for GoSat Approval
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="absolute bottom-6 left-6 right-6 z-20">
        <p className="text-xs text-center font-light leading-relaxed" style={{
          color: currentTheme.accentLight,
          textShadow: `0 0 10px ${currentTheme.shadow}`
        }}>
          After GoSat approval you will receive official logos, banners & brand kit • Every post must include a Share button that leads to s2gapp.com
        </p>
      </div>

      {/* Bottom-right Social Link */}
      <div className="absolute bottom-6 right-6 z-20">
        <a 
          href="https://s2gapp.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:scale-105"
          style={{
            backgroundColor: currentTheme.secondaryButton,
            borderColor: currentTheme.cardBorder,
            borderWidth: '1px',
            color: currentTheme.accentLight,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = currentTheme.accent;
            e.currentTarget.style.color = currentTheme.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
            e.currentTarget.style.color = currentTheme.accentLight;
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="text-sm font-medium">s2gapp.com</span>
        </a>
      </div>
    </div>
  );
}

