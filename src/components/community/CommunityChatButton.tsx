/**
 * Floating Community Chat Button
 * Always visible floating button to open S2G Community Chat
 */

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { CommunityChat } from './CommunityChat'
import { getCurrentTheme } from '@/utils/dashboardThemes'

export function CommunityChatButton() {
  const [isOpen, setIsOpen] = useState(false)
  const currentTheme = getCurrentTheme()

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
          color: 'white',
          boxShadow: `0 8px 25px rgba(249, 115, 22, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)`,
        }}
        title="S2G Chatapp All - Community Chat"
      >
        <MessageSquare className="h-5 w-5" />
        <span className="font-semibold text-sm">s2g chatapp all</span>
      </button>

      <CommunityChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

