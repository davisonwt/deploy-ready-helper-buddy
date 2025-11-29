import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useGamification } from '@/hooks/useGamification'
import { useAuth } from '@/hooks/useAuth'
import { launchConfetti, floatingScore } from '@/utils/confetti'
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
  { id: 'bestow-5', icon: '🌧️', title: 'Bestow 5 USDC today', xp: 250 },
  { id: 'play-3-tracks', icon: '🎵', title: 'Upload or play 3 tracks', xp: 150 },
  { id: 'invite-friend', icon: '👥', title: 'Invite 1 friend who joins', xp: 500, rare: true },
]

export function MasteryModal({ isOpen, onClose }: MasteryModalProps) {
  const { user } = useAuth()
  const { userPoints, achievements } = useGamification()
  const [progressPercentage, setProgressPercentage] = useState(0)
  const [treeShake, setTreeShake] = useState(false)

  // Level thresholds based on database logic
  const getLevelThresholds = (level: number) => {
    switch (level) {
      case 1: return { start: 0, end: 100 }
      case 2: return { start: 100, end: 250 }
      case 3: return { start: 250, end: 500 }
      case 4: return { start: 500, end: 1000 }
      case 5: return { start: 1000, end: Infinity }
      default: return { start: 0, end: 100 }
    }
  }

  // Calculate progress percentage for circular progress ring
  useEffect(() => {
    if (userPoints) {
      const thresholds = getLevelThresholds(userPoints.level)
      const levelRange = thresholds.end - thresholds.start
      if (levelRange === Infinity) {
        // For max level, show 100%
        setProgressPercentage(100)
      } else {
        const currentLevelXP = userPoints.total_points - thresholds.start
        const percentage = levelRange > 0 ? Math.min((currentLevelXP / levelRange) * 100, 100) : 100
        setProgressPercentage(Math.max(0, percentage))
      }
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
    .slice(0, 3) // Show up to 3 badges

  // Calculate XP progress
  const currentXP = userPoints?.total_points || 0
  const thresholds = userPoints ? getLevelThresholds(userPoints.level) : { start: 0, end: 100 }
  const levelRange = thresholds.end === Infinity ? 10000 : thresholds.end - thresholds.start
  const levelXP = currentXP - thresholds.start
  const xpProgress = `${levelXP.toLocaleString()} / ${levelRange === Infinity ? '∞' : levelRange.toLocaleString()} XP`

  const handleShare = async () => {
    const levelTitle = getLevelTitle(userPoints?.level || 1)
    const shareText = `🌳 I'm a ${levelTitle} on S2G! Level ${userPoints?.level || 1} with ${currentXP} XP. Join me and grow your orchard!`
    
    // Trigger confetti and floating score
    launchConfetti()
    floatingScore(10)
    
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

  // Calculate circular progress stroke-dashoffset
  const circumference = 2 * Math.PI * 45 // radius is 45
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference

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
          className="max-w-2xl w-full bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 rounded-3xl shadow-4xl p-8 text-white text-center relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Floating leaves background effect */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute animate-drift" style={{ left: '10%', animationDelay: '0s' }}>Leaf</div>
            <div className="absolute animate-drift delay-1000" style={{ left: '50%', animationDelay: '5s' }}>Petal</div>
            <div className="absolute animate-drift delay-2000" style={{ left: '80%', animationDelay: '10s' }}>Tiny Fruit</div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-6 text-4xl hover:scale-125 transition z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Title */}
          <h2 className="text-5xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            Your Eternal Orchard 🌳
          </h2>

          {/* The Living Tree (grows with real XP) */}
          <div className="relative mx-auto w-80 h-96 mb-10">
            <motion.svg
              viewBox="0 0 300 400"
              className="w-full h-full drop-shadow-2xl"
              animate={treeShake ? {
                x: [0, -5, 5, -5, 5, 0],
              } : {}}
              transition={{ duration: 0.5 }}
            >
              {/* Trunk (thickens per level) */}
              <rect
                x={135 - (userPoints?.level || 1) * 0.5}
                y="280"
                width={30 + (userPoints?.level || 1) * 0.3}
                height="120"
                rx="15"
                fill="#8B4513"
                stroke="#654321"
                strokeWidth="6"
              />

              {/* Canopy (expands with level) */}
              <ellipse
                cx="150"
                cy="220"
                rx={100 + (userPoints?.level || 1) * 2}
                ry={90 + (userPoints?.level || 1) * 2}
                fill="#1a5f3a"
                opacity="0.9"
              />
              <ellipse
                cx="150"
                cy="180"
                rx={80 + (userPoints?.level || 1) * 1.5}
                ry={70 + (userPoints?.level || 1) * 1.5}
                fill="#228B22"
              />
              <ellipse
                cx="150"
                cy="150"
                rx={60 + (userPoints?.level || 1) * 1}
                ry={55 + (userPoints?.level || 1) * 1}
                fill="#34d399"
                opacity="0.8"
              />

              {/* Fruits appear as user levels up */}
              {progressPercentage > 20 && (
                <motion.circle
                  cx="110"
                  cy="170"
                  r="18"
                  fill="#facc15"
                  className="fruit"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                />
              )}
              {progressPercentage > 50 && (
                <motion.circle
                  cx="190"
                  cy="160"
                  r="15"
                  fill="#f43f5e"
                  className="fruit"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                />
              )}
              {progressPercentage > 80 && (
                <motion.circle
                  cx="150"
                  cy="130"
                  r="20"
                  fill="#fbbf24"
                  className="fruit"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                />
              )}

              {/* XP as glowing roots */}
              <path
                d="M100 400 Q150 370 200 400"
                fill="none"
                stroke="#facc15"
                strokeWidth="12"
                opacity="0.6"
              />
              <rect x="100" y="395" width="100" height="10" rx="5" fill="#4A5568" />
              <motion.rect
                x="100"
                y="395"
                width={`${progressPercentage}px`}
                height="10"
                rx="5"
                fill="#facc15"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}px` }}
                transition={{ duration: 2, ease: 'easeOut' }}
                className="animate-pulse"
              />
            </motion.svg>
          </div>

          {/* Level + XP */}
          <div className="text-6xl font-black mb-2">
            Level {userPoints?.level || 1} • {getLevelTitle(userPoints?.level || 1)}
          </div>
          <div className="text-2xl text-yellow-300 mb-8">{xpProgress}</div>

          {/* Progress ring (replaces the boring bar) */}
          <div className="relative w-48 h-48 mx-auto mb-10">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#1a1a2e"
                strokeWidth="10"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#facc15"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 2, ease: 'easeOut' }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold">
              {Math.round(progressPercentage)}%
            </div>
          </div>

          {/* Active Quests */}
          <div className="bg-white/10 backdrop-blur rounded-3xl p-6 mb-6 text-left">
            <h3 className="text-2xl font-bold mb-4 text-center">Today's Growth Quests</h3>
            <div className="space-y-4">
              {quests.map((quest) => (
                <div
                  key={quest.id}
                  className="flex justify-between items-center bg-white/10 rounded-2xl p-4"
                >
                  <span>{quest.icon} {quest.title}</span>
                  <span className={`font-bold ${quest.rare ? 'text-yellow-400' : 'text-green-400'}`}>
                    +{quest.xp} XP{quest.rare ? ' • Rare Seed!' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Badges as hanging fruits */}
          <div className="flex justify-center gap-6 flex-wrap mb-6">
            {userBadges.length > 0 ? (
              userBadges.map((badge, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-yellow-500 to-orange-600 p-4 rounded-full shadow-2xl hover:scale-110 transition"
                >
                  {badge.icon} {badge.title}
                </div>
              ))
            ) : (
              <>
                <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-4 rounded-full shadow-2xl hover:scale-110 transition opacity-50">
                  Top Sower
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-full shadow-2xl hover:scale-110 transition opacity-50">
                  100-Day Streak
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-4 rounded-full shadow-2xl hover:scale-110 transition opacity-50">
                  Master of Rain
                </div>
              </>
            )}
          </div>

          {/* Share button */}
          <Button
            onClick={handleShare}
            className="mt-10 bg-gradient-to-r from-teal-500 to-cyan-400 px-12 py-6 rounded-full text-2xl font-bold hover:scale-110 transition shadow-2xl w-full"
          >
            🌟 Share My Living Tree!
          </Button>

          {/* Styles */}
          <style>{`
            @keyframes drift {
              0% { transform: translateY(100vh) rotate(0deg); }
              100% { transform: translateY(-100px) rotate(360deg); }
            }
            .animate-drift {
              position: absolute;
              font-size: 2rem;
              opacity: 0.3;
              animation: drift 20s linear infinite;
            }
            .delay-1000 { animation-delay: 5s; }
            .delay-2000 { animation-delay: 10s; }
            .fruit {
              animation: sway 4s ease-in-out infinite;
            }
            @keyframes sway {
              0%, 100% { transform: translateX(0); }
              50% { transform: translateX(10px); }
            }
          `}</style>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
