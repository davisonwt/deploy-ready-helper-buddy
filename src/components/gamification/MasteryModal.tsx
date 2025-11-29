import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useGamification } from '@/hooks/useGamification'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { launchConfetti, launchSparkles, floatingScore } from '@/utils/confetti'

interface MasteryModalProps {
  isOpen: boolean
  onClose: () => void
}

interface UserProgress {
  user_id: string
  xp: number
  level: number
  fruits: number
  streak: number
  last_active: string
}

// Level titles
const getTitle = (level: number): string => {
  if (level < 3) return 'Seed'
  if (level < 7) return 'Sapling'
  if (level < 15) return 'Fruit Bearer'
  if (level < 30) return 'Master Sower'
  return 'Eternal Gardener'
}

// Calculate XP required for a level
const xpForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(level, 2.1))
}

export function MasteryModal({ isOpen, onClose }: MasteryModalProps) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<any>(null)
  const [previousLevel, setPreviousLevel] = useState(1)
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false)
  const [levelUpText, setLevelUpText] = useState<{ level: number; title: string } | null>(null)
  const treeRef = useRef<SVGSVGElement>(null)
  const lastLevelRef = useRef<number>(1)

  // Level-up animation function
  const triggerLevelUpAnimation = (newLevel: number) => {
    if (newLevel <= lastLevelRef.current) return

    // 1. Divine flash
    const flash = document.createElement('div')
    flash.style.position = 'fixed'
    flash.style.inset = '0'
    flash.style.background = 'radial-gradient(circle, #fbbf24 0%, transparent 70%)'
    flash.style.opacity = '0'
    flash.style.pointerEvents = 'none'
    flash.style.zIndex = '99999'
    document.body.appendChild(flash)
    
    requestAnimationFrame(() => {
      flash.style.transition = 'opacity 0.6s'
      flash.style.opacity = '1'
      setTimeout(() => { flash.style.opacity = '0' }, 300)
      setTimeout(() => flash.remove(), 1000)
    })

    // 2. MASSIVE confetti + sparkles
    launchConfetti()
    launchConfetti() // twice = biblical
    launchSparkles()
    setTimeout(() => launchConfetti(), 300)

    // 3. Show level-up text
    setLevelUpText({ level: newLevel, title: getTitle(newLevel) })
    setShowLevelUpAnimation(true)

    // 4. Tree GROW animation
    if (treeRef.current) {
      treeRef.current.style.transition = 'transform 1.5s ease-out'
      treeRef.current.style.transform = 'scale(1.15) translateY(-20px)'
      setTimeout(() => {
        if (treeRef.current) {
          treeRef.current.style.transform = 'scale(1) translateY(0)'
        }
      }, 800)
    }

    // 5. Floating +LEVEL fruits
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        floatingScore(
          newLevel * 10,
          window.innerWidth / 2 + Math.random() * 300 - 150,
          window.innerHeight / 2
        )
      }, i * 150)
    }

    // Hide animation after 4 seconds
    setTimeout(() => {
      setShowLevelUpAnimation(false)
      setLevelUpText(null)
    }, 4000)
  }

  // Load user progress from Supabase
  const loadUserProgress = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      let { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // First time – create row with 50 XP
        const { data: newData, error: insertError } = await supabase
          .from('user_progress')
          .insert({ user_id: user.id, xp: 50, level: 1, fruits: 0, streak: 1 })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating user progress:', insertError)
          setLoading(false)
          return
        }

        data = newData
      } else if (error) {
        console.error('Error loading user progress:', error)
        setLoading(false)
        return
      }

      if (data) {
        lastLevelRef.current = data.level
        setProgress(data)
        setPreviousLevel(data.level)
        updateTree(data)
      }
    } catch (error) {
      console.error('Error in loadUserProgress:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update tree visualization based on progress
  const updateTree = (data: UserProgress) => {
    const oldLevel = progress?.level || 1
    
    setProgress(data)
    
    // Trigger animations on XP increase
    if (data.xp > (progress?.xp || 0)) {
      const xpGained = data.xp - (progress?.xp || 0)
      if (xpGained > 0 && data.level === oldLevel) {
        // Only show confetti/sparkles if not leveling up
        launchConfetti()
        launchSparkles()
        floatingScore(xpGained)
      }
    }

    // Inside updateTree(data) — after all other updates
    if (data.level > lastLevelRef.current) {
      triggerLevelUpAnimation(data.level)
      lastLevelRef.current = data.level
      setPreviousLevel(data.level)
    }
  }

  // Calculate XP progress percentage
  const getXPProgress = () => {
    if (!progress) return { current: 0, next: 1000, percent: 0, display: '0 / 1000 XP' }
    
    const currentLevel = progress.level
    const nextLevel = currentLevel + 1
    const prevXP = xpForLevel(currentLevel)
    const nextXP = xpForLevel(nextLevel)
    const currentXP = progress.xp
    const percent = Math.min(((currentXP - prevXP) / (nextXP - prevXP)) * 100, 100)
    
    return {
      current: currentXP - prevXP,
      next: nextXP - prevXP,
      percent,
      display: `${(currentXP - prevXP).toLocaleString()} / ${(nextXP - prevXP).toLocaleString()} XP`
    }
  }

  // Set up real-time subscription
  useEffect(() => {
    if (!isOpen || !user) return

    // Load initial data
    loadUserProgress()

    // Set up real-time subscription
    const channel = supabase
      .channel('progress-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newProgress = payload.new as UserProgress
          updateTree(newProgress)
        }
      )
      .subscribe()

    channelRef.current = channel

    // Cleanup on unmount or close
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [isOpen, user])

  if (!isOpen) return null

  const xpProgress = getXPProgress()
  const trunkWidth = 40 + Math.min((progress?.level || 1) * 4, 80)
  const trunkX = 200 - trunkWidth / 2
  const fruitCount = Math.floor((progress?.level || 1) / 2)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="max-w-2xl w-full bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 rounded-3xl shadow-4xl p-10 text-white relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-8 text-5xl hover:scale-125 transition z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Title */}
          <h2 className="text-6xl font-black text-center mb-8 bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            Your Living Orchard 🌳
          </h2>

          {/* LIVE TREE SVG */}
          <div className="relative mx-auto w-96 h-96 mb-12">
            <svg ref={treeRef} id="live-tree" viewBox="0 0 400 500" className="w-full h-full">
              {/* Trunk grows thicker every 5 levels */}
              <rect
                id="trunk"
                x={trunkX}
                y="320"
                width={trunkWidth}
                height="180"
                rx="20"
                fill="#8B4513"
                className="transition-all duration-1000"
              />

              {/* Canopy layers – appear one by one */}
              <ellipse
                id="canopy1"
                cx="200"
                cy="280"
                rx="60"
                ry="50"
                fill="#34d399"
                opacity={(progress?.level || 0) >= 1 ? 0.9 : 0}
                className="transition-opacity duration-1000"
              />
              <ellipse
                id="canopy2"
                cx="200"
                cy="220"
                rx="100"
                ry="80"
                fill="#228B22"
                opacity={(progress?.level || 0) >= 5 ? 1 : 0}
                className="transition-opacity duration-1000"
              />
              <ellipse
                id="canopy3"
                cx="200"
                cy="160"
                rx="140"
                ry="110"
                fill="#1a5f3a"
                opacity={(progress?.level || 0) >= 10 ? 0.8 : 0}
                className="transition-opacity duration-1000"
              />

              {/* Fruits appear at certain XP thresholds */}
              <g id="fruits">
                {Array.from({ length: fruitCount }).map((_, i) => {
                  const colors = ['#facc15', '#f43f5e', '#fbbf24']
                  // Deterministic positioning based on index
                  const angle = (i / fruitCount) * Math.PI * 2
                  const radius = 80 + (i % 3) * 20
                  const cx = 200 + Math.cos(angle) * radius
                  const cy = 200 + Math.sin(angle) * radius - 50
                  const r = 12 + (i % 3) * 3
                  return (
                    <motion.circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={colors[i % 3]}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: i * 0.1 }}
                      className="fruit"
                    />
                  )
                })}
              </g>
            </svg>

            {/* XP Ring around the base */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-12">
              <svg viewBox="0 0 200 40" className="w-full">
                <rect x="10" y="15" width="180" height="10" rx="5" fill="#1e293b" />
                <motion.rect
                  id="xp-fill"
                  x="10"
                  y="15"
                  width={`${180 * (xpProgress.percent / 100)}`}
                  height="10"
                  rx="5"
                  fill="#facc15"
                  initial={{ width: 0 }}
                  animate={{ width: 180 * (xpProgress.percent / 100) }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />
                <text
                  x="100"
                  y="30"
                  textAnchor="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="bold"
                  id="xp-text"
                >
                  {xpProgress.display}
                </text>
              </svg>
            </div>
          </div>

          {/* Level Display */}
          <div className="text-center mb-4">
            <span className="text-7xl font-black text-yellow-400">
              {progress?.level || 1}
            </span>
            <div className="text-3xl mt-4 opacity-80">
              {getTitle(progress?.level || 1)}
            </div>
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-3 gap-6 mt-12 text-center">
            <div className="bg-white/10 rounded-2xl p-6">
              <div className="text-4xl font-bold text-yellow-400" id="live-xp">
                {progress?.xp.toLocaleString() || 0}
              </div>
              <div className="text-sm opacity-80 mt-2">XP Earned</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-6">
              <div className="text-4xl font-bold text-pink-400" id="live-fruits">
                {progress?.fruits || 0}
              </div>
              <div className="text-sm opacity-80 mt-2">Fruits Grown</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-6">
              <div className="text-4xl font-bold text-emerald-400" id="live-streak">
                {progress?.streak || 0}
              </div>
              <div className="text-sm opacity-80 mt-2">Day Streak</div>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-2xl">Loading your orchard...</div>
            </div>
          )}
        </motion.div>

        {/* Level-Up Animation Overlay */}
        <AnimatePresence>
          {showLevelUpAnimation && levelUpText && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 0 }}
              animate={{ opacity: 1, scale: 1.2, y: -80 }}
              exit={{ opacity: 0, scale: 0.8, y: -120 }}
              transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[999999] text-center"
            >
              <div
                className="text-8xl font-black"
                style={{
                  background: 'linear-gradient(to bottom, #facc15, #f43f5e)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  textShadow: '0 0 40px #fbbf24',
                }}
              >
                LEVEL {levelUpText.level}
              </div>
              <div
                className="text-5xl mt-4"
                style={{
                  color: '#fbbf24',
                  textShadow: '0 0 30px #facc15',
                }}
              >
                {levelUpText.title}!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
