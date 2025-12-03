/**
 * Floating Community Chat Button
 * Always visible floating button to open S2G Community Chat
 */

import { useState, Suspense, lazy, useEffect } from 'react'
import { MessageSquare } from 'lucide-react'

// Lazy load CommunityChat to avoid initialization issues
const CommunityChat = lazy(() => import('./CommunityChat').then(module => ({ default: module.CommunityChat })))

export function CommunityChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component only renders after React is fully initialized
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-32 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 opacity-30 hover:opacity-100"
        style={{
          background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
          color: 'white',
          boxShadow: `0 8px 25px rgba(249, 115, 22, 0.2)`,
        }}
        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 8px 25px rgba(249, 115, 22, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 8px 25px rgba(249, 115, 22, 0.2)'}
        title="S2G Chatapp All - Community Chat"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="font-semibold text-sm">s2g chatapp all</span>
      </button>

      {isOpen && (
        <Suspense fallback={null}>
          <CommunityChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  )
}

