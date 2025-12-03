import { useState } from 'react'
import { motion } from 'framer-motion'
import { MasteryModal } from './MasteryModal'

export function ProgressButton() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <motion.button
        id="progress-btn"
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-yellow-500/20 to-pink-500/20 hover:from-yellow-500 hover:to-pink-500 text-white/50 hover:text-white text-xl font-bold px-8 py-6 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        🌳 Your Progress
      </motion.button>

      <MasteryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

