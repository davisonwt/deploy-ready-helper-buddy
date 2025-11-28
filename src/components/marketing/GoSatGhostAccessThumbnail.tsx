import React from 'react';

export function GoSatGhostAccessThumbnail() {
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

      {/* Center Card */}
      <div className="absolute inset-0 flex items-center justify-center z-10 px-8 py-6">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-7xl w-full border-2 relative" style={{
          borderColor: 'rgba(255,215,0,0.3)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,215,0,0.2), inset 0 0 30px rgba(255,215,0,0.1), 0 0 60px rgba(124,58,237,0.3)'
        }}>
          {/* Logo - Top Left Corner */}
          <div className="absolute top-4 left-4 z-20">
            <div className="flex flex-col items-start">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" style={{
                textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.4), 0 0 60px rgba(255,215,0,0.2)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '3px',
                lineHeight: '1',
                fontWeight: '800'
              }}>
                2SG
              </div>
              <div className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 mt-1" style={{
                textShadow: '0 0 15px rgba(255,215,0,0.6), 0 0 30px rgba(255,215,0,0.3)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '2px',
                fontWeight: '600'
              }}>
                App
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-2 text-center" style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 30px rgba(255,215,0,0.5)'
          }}>
            GoSat's Ghost Access – Real-Time Community Oversight
          </h1>
          
          {/* Subtitle */}
          <p className="text-sm text-white/90 text-center mb-4 font-light">
            Silently monitor & moderate every new chat, room, radio, or community created by users
          </p>

          {/* Top Banner */}
          <div className="mb-4 px-4 py-2 rounded-lg text-center text-xs font-medium" style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.15) 100%)',
            border: '1px solid rgba(255,215,0,0.3)',
            color: '#fbbf24'
          }}>
            GoSat's has invisible ghost access to ALL new chats & rooms for instant moderation
          </div>

          {/* Main Interface */}
          <div className="flex gap-4 h-96">
            {/* Left Sidebar */}
            <div className="w-48 bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="space-y-2">
                {['1-on-1 Chats', 'Community Groups', 'Live Rooms', 'Radio Channels', 'Announcements'].map((tab, idx) => (
                  <div 
                    key={tab}
                    className={`px-3 py-2 rounded text-xs font-medium cursor-pointer transition-all ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                    }`}
                  >
                    {tab}
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
              {/* Chat Previews Grid */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {Array.from({ length: 8 }).map((_, idx) => {
                  const isFlagged = idx === 2;
                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        isFlagged 
                          ? 'bg-red-900/30 border-red-500/50 ring-2 ring-red-500/30' 
                          : 'bg-gray-700/30 border-gray-600/50'
                      }`}
                    >
                      {isFlagged && (
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-red-400 font-semibold">FLAGGED</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-amber-400"></div>
                        <div className="flex-1">
                          <div className="h-2 bg-gray-600 rounded mb-1" style={{ width: '60%' }}></div>
                          <div className="h-1.5 bg-gray-700 rounded" style={{ width: '40%' }}></div>
                        </div>
                      </div>
                      <div className="h-8 bg-gray-600/50 rounded text-xs text-gray-400 flex items-center px-2">
                        {isFlagged ? 'Inappropriate Content Detected' : 'Chat preview...'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex-1 py-3 px-4 rounded-lg font-semibold text-white text-sm shadow-lg hover:shadow-xl transition-all" style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  boxShadow: '0 4px 15px rgba(220,38,38,0.4)'
                }}>
                  DELETE POST
                </button>
                <button className="flex-1 py-3 px-4 rounded-lg font-semibold text-white text-sm shadow-lg hover:shadow-xl transition-all" style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 4px 15px rgba(16,185,129,0.4)'
                }}>
                  APPROVE / DISMISS
                </button>
              </div>
            </div>
          </div>

          {/* Lock Icon with Text */}
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Users cannot see GoSat presence – 100% hidden monitoring</span>
          </div>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="absolute bottom-10 left-0 right-0 z-20 px-8">
        <p className="text-xs text-amber-200/90 text-center font-light" style={{
          textShadow: '0 0 10px rgba(0,0,0,0.5)'
        }}>
          Ensuring a safe, on-brand 2SG ecosystem • Powered by GoSat Guardians
        </p>
      </div>
    </div>
  );
}

