import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Share2 } from 'lucide-react'
import { useGamification } from '@/hooks/useGamification'
import { useAuth } from '@/hooks/useAuth'
import { launchConfetti } from '@/utils/confetti'
import { Button } from '@/components/ui/button'

interface MasteryModalProps {
  isOpen: boolean
  onClose: () => void
}

// Level titles based on level
const getLevelTitle = (level: number): string => {
  if (level < 5) return 'Seedling'
  if (level < 10) return 'Sprout'
  if (level < 20) return 'Sapling'
  if (level < 30) return 'Fruit Bearer'
  if (level < 50) return 'Grove Keeper'
  if (level < 75) return 'Orchard Master'
  return 'Elder Tree'
}

// Quest definitions
const quests = [
  { id: 'upload-music', icon: '📤', title: 'Upload Music', xp: 100 },
  { id: 'bestow-2', icon: '☔', title: 'Bestow 2 USDC', xp: 100 },
  { id: 'invite-friend', icon: '👥', title: 'Invite Friend', xp: 500 },
  { id: 'host-radio', icon: '📻', title: 'Host Radio', xp: 200 },
]

export function MasteryModal({ isOpen, onClose }: MasteryModalProps) {
  const { user } = useAuth()
  const { userPoints, achievements } = useGamification()
  const [xpBarWidth, setXpBarWidth] = useState(0)
  const [treeShake, setTreeShake] = useState(false)

  // Calculate XP bar width based on points_to_next_level
  useEffect(() => {
    if (userPoints) {
      // Calculate progress: if points_to_next_level is 100, and user has 60 points in this level,
      // then progress is 40% (60/100)
      // We need to calculate current level XP from total_points
      const pointsPerLevel = 1000 // Standard level size
      const currentLevelStartXP = (userPoints.level - 1) * pointsPerLevel
      const currentLevelXP = userPoints.total_points - currentLevelStartXP
      const pointsNeededForLevel = pointsPerLevel
      const width = Math.min((currentLevelXP / pointsNeededForLevel) * 100, 100)
      setXpBarWidth(Math.max(0, width))
    }
  }, [userPoints])

  // Check for level up (when level changes)
  const [previousLevel, setPreviousLevel] = useState(1)
  useEffect(() => {
    if (userPoints && userPoints.level > previousLevel) {
      // Trigger confetti and tree shake on level up
      launchConfetti()
      setTreeShake(true)
      setTimeout(() => setTreeShake(false), 500)
      setPreviousLevel(userPoints.level)
    } else if (userPoints) {
      setPreviousLevel(userPoints.level)
    }
  }, [userPoints?.level, previousLevel])

  // Get user badges from achievements
  const userBadges = achievements
    .filter(a => a.icon)
    .slice(0, 4) // Show up to 4 badges

  // Calculate XP progress
  const currentXP = userPoints?.total_points || 0
  const xpToNext = userPoints?.points_to_next_level || 100
  const pointsPerLevel = 1000
  const currentLevelStartXP = userPoints ? (userPoints.level - 1) * pointsPerLevel : 0
  const levelXP = currentXP - currentLevelStartXP
  const xpProgress = `${levelXP} / ${pointsPerLevel} XP`

  const handleShare = async () => {
    const shareText = `🌳 I'm a ${getLevelTitle(userPoints?.level || 1)} on S2G! Level ${userPoints?.level || 1} with ${currentXP} XP. Join me and grow your orchard!`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My S2G Progress',
          text: shareText,
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText)
      alert('Progress copied to clipboard!')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 rounded-4xl shadow-3xl p-12 text-white text-center relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-8 text-4xl hover:scale-125 transition-transform"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Animated Tree SVG */}
          <motion.svg
            id="progress-tree"
            viewBox="0 0 400 500"
            className="mx-auto mb-12 w-96 h-96"
            animate={treeShake ? {
              x: [0, -5, 5, -5, 5, 0],
            } : {}}
            transition={{ duration: 0.5 }}
          >
            {/* Trunk (thickens with level) */}
            <rect
              x={190 - (userPoints?.level || 1) * 0.5}
              y="350"
              width={20 + (userPoints?.level || 1) * 0.3}
              height="150"
              rx="10"
              fill="#8B4513"
              stroke="#D2691E"
              strokeWidth="4"
            />

            {/* Leaves/Fruits (fill on progress) */}
            <circle
              cx="200"
              cy="280"
              r={80 + (userPoints?.level || 1) * 2}
              fill="#228B22"
              opacity={0.7 + (xpBarWidth / 100) * 0.3}
            />

            {/* Fruits (appear as progress increases) */}
            {xpBarWidth > 20 && (
              <motion.circle
                cx="160"
                cy="250"
                r="25"
                fill="#FFD700"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="animate-bounce"
              />
            )}
            {xpBarWidth > 50 && (
              <motion.circle
                cx="240"
                cy="240"
                r="20"
                fill="#FF6347"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="animate-bounce"
              />
            )}
            {xpBarWidth > 80 && (
              <motion.circle
                cx="200"
                cy="220"
                r="18"
                fill="#FFD700"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="animate-bounce"
              />
            )}

            {/* XP Bar as Roots */}
            <rect
              x="100"
              y="480"
              width="200"
              height="15"
              rx="8"
              fill="#4A5568"
            />
            <motion.rect
              id="xp-bar"
              x="100"
              y="480"
              width={`${xpBarWidth * 2}px`}
              height="15"
              rx="8"
              fill="#48BB78"
              initial={{ width: 0 }}
              animate={{ width: `${xpBarWidth * 2}px` }}
              transition={{ duration: 2, ease: 'easeOut' }}
            />
          </motion.svg>

          {/* Level & XP */}
          <h2
            id="level-title"
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent"
          >
            {getLevelTitle(userPoints?.level || 1)}
          </h2>
          <p id="xp-text" className="text-2xl mb-8 text-yellow-300">
            {xpProgress}
          </p>
          <p className="text-lg mb-8 text-teal-300">
            Level {userPoints?.level || 1} • {xpToNext} XP to next level
          </p>

          {/* Quests */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="bg-white/10 p-6 rounded-3xl hover:scale-105 transition-transform cursor-pointer backdrop-blur-lg"
              >
                <div className="text-3xl mb-2">{quest.icon}</div>
                <div className="font-semibold text-lg mb-1">{quest.title}</div>
                <span className="text-green-400 font-bold">+{quest.xp} XP</span>
              </div>
            ))}
          </div>

          {/* Badges */}
          {userBadges.length > 0 && (
            <div className="flex justify-center gap-4 mb-8 flex-wrap">
              {userBadges.map((badge, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-bold shadow-lg"
                >
                  {badge.icon} {badge.title}
                </div>
              ))}
            </div>
          )}

          {/* Default badges if none unlocked */}
          {userBadges.length === 0 && (
            <div className="flex justify-center gap-4 mb-8 flex-wrap">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-bold shadow-lg opacity-50">
                🥇 Top Sower
              </div>
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg opacity-50">
                🔥 30-Day Streak
              </div>
            </div>
          )}

          {/* Share & Close */}
          <Button
            onClick={handleShare}
            className="bg-teal-500 hover:bg-teal-400 px-12 py-6 rounded-3xl font-bold text-2xl mb-4 shadow-2xl hover:scale-105 transition-transform w-full"
          >
            <Share2 className="w-6 h-6 mr-2 inline" />
            Share My Tree!
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

