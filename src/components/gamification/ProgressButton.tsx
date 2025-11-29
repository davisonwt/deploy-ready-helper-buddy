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
        className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-yellow-500 to-pink-500 text-white text-xl font-bold px-8 py-6 rounded-full shadow-2xl hover:scale-110 transition-all animate-pulse"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        🌳 Your Progress
      </motion.button>

      <MasteryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}

