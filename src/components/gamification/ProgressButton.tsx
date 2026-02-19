import { useState } from 'react'
import { motion } from 'framer-motion'
import { MasteryModal } from './MasteryModal'
import { useCallManager } from '@/hooks/useCallManager'
import { useLocation } from 'react-router-dom'

export function ProgressButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { currentCall } = useCallManager()
  const location = useLocation()

  // Only show on dashboard
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/'
  if (!isDashboard) return null
  if (currentCall && currentCall.status !== 'ended') return null

  return (
    <>
      <motion.button
        id="progress-btn"
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-8 z-50 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white text-xl font-bold px-8 py-6 rounded-full shadow-lg shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-400/40 transition-all duration-300 border-2 border-amber-400/50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        🌳 Your Progress
      </motion.button>

      <MasteryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

