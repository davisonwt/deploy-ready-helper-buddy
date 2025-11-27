import React from 'react';

export function AmbassadorThumbnail() {
  return (
    <div className="relative w-full aspect-video bg-gradient-to-br from-purple-950 via-indigo-950 to-amber-950 overflow-hidden">
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
        <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" style={{
          textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.4)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '2px'
        }}>
          2SG
        </div>
        <div className="text-xs text-amber-300/80 mt-1" style={{ textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>2SGApp</div>
      </div>

      {/* Center Card */}
      <div className="absolute inset-0 flex items-center justify-center z-10 px-8">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-4xl w-full border border-amber-200/30" style={{
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)'
        }}>
          {/* Title */}
          <h1 className="text-4xl font-bold mb-2 text-center" style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Become a 2SG Ambassador
          </h1>
          
          {/* Subtitle */}
          <p className="text-sm text-gray-600 text-center mb-6 font-light tracking-wide">
            Sowers • Growers • Bestowers • Whisperers • Guardians • Harvesters
          </p>

          {/* Application Form */}
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            {/* Current 2SG Role */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current 2SG Role</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent">
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Desired Username</label>
              <div className="flex items-center">
                <span className="px-4 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-700 font-mono">s2g@</span>
                <input 
                  type="text" 
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="gosatqueen"
                />
              </div>
            </div>

            {/* Platform Checkboxes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Platforms</label>
              <div className="grid grid-cols-5 gap-2">
                {['TikTok', 'YouTube', 'Instagram', 'Facebook', 'Twitter/X', 'Discord', 'Snapchat', 'Reddit', 'Telegram', 'WhatsApp'].map((platform) => (
                  <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500" />
                    <span className="text-xs text-gray-700">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Business/Ministry/Brand Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Business / Ministry / Personal Brand Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder="Enter your brand name"
              />
            </div>

            {/* Why I want to represent 2SG */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Why I want to represent 2SG</label>
              <textarea 
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder="Tell us about your passion for the 2SG community..."
              />
            </div>

            {/* Submit Button */}
            <button className="w-full py-4 rounded-xl font-semibold text-white text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]" style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #f59e0b 100%)',
              boxShadow: '0 10px 25px -5px rgba(124,58,237,0.5), 0 0 0 1px rgba(255,215,0,0.2)'
            }}>
              Submit for GoSat Approval
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="absolute bottom-6 left-6 right-6 z-20">
        <p className="text-xs text-amber-200/90 text-center font-light leading-relaxed" style={{
          textShadow: '0 0 10px rgba(0,0,0,0.5)'
        }}>
          After GoSat approval you will receive official logos, banners & brand kit • Every post must include a Share button that leads to s2gapp.com
        </p>
      </div>

      {/* Bottom-right Social Icons */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {/* Social Media Icons */}
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-amber-300/30">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.79 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
          </div>
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-amber-300/30">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-amber-300/30">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-amber-300/30">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </div>
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-amber-300/30">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.173-.041-.248-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.686z"/>
            </svg>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-amber-300">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium" style={{ textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>s2gapp.com</span>
        </div>
      </div>
    </div>
  );
}

