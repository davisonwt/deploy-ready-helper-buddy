import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Award, Bell, CheckCircle } from 'lucide-react'
import { useGamification } from '@/hooks/useGamification'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { launchConfetti, launchSparkles, floatingScore } from '@/utils/confetti'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Define playSoundEffect locally if needed
const playSoundEffect = (sound: string, volume?: number) => {
  try {
    const audio = new Audio(`/sounds/${sound}.mp3`);
    audio.volume = volume || 0.5;
    audio.play().catch(() => {});
  } catch (e) {}
};

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
  const [activeTab, setActiveTab] = useState<"tree" | "achievements" | "notifications">("tree")
  
  // Get gamification data
  let achievements: any[] = []
  let notifications: any[] = []
  let userPoints: any = null
  let markNotificationAsRead = async (id: string) => {}
  
  try {
    const gamification = useGamification()
    achievements = gamification.achievements
    notifications = gamification.notifications
    userPoints = gamification.userPoints
    markNotificationAsRead = gamification.markNotificationAsRead
  } catch (error) {
    console.warn('MasteryModal: gamification hook error', error)
  }
  
  const unreadNotifications = notifications.filter(n => !n.is_read)
  
  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id)
    }
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  // ULTIMATE APOCALYPTIC LEVEL-UP ANIMATION 9000
  const triggerLevelUpAnimation = (newLevel: number) => {
    if (newLevel <= lastLevelRef.current) return

    // 1. FULL-SCREEN GOLDEN EXPLOSION FLASH
    const apocalypse = document.createElement('div')
    apocalypse.style.position = 'fixed'
    apocalypse.style.inset = '0'
    apocalypse.style.background = 'radial-gradient(circle at center, #fffbe6 0%, #fbbf24 30%, #f43f5e 100%)'
    apocalypse.style.opacity = '0'
    apocalypse.style.pointerEvents = 'none'
    apocalypse.style.zIndex = '9999999'
    document.body.appendChild(apocalypse)
    
    requestAnimationFrame(() => {
      apocalypse.style.transition = 'opacity 0.4s ease-out'
      apocalypse.style.opacity = '1'
      setTimeout(() => {
        apocalypse.style.transition = 'opacity 1.6s'
        apocalypse.style.opacity = '0'
        setTimeout(() => apocalypse.remove(), 1600)
      }, 400)
    })

    // 2. TRIPLE CONFETTI + SPARKLE TSUNAMI
    try { playSoundEffect('levelUp', 0.9) } catch {} // EPIC choir + bell
    for (let i = 0; i < 5; i++) {
      setTimeout(() => launchConfetti(), i * 150)
    }
    for (let i = 0; i < 3; i++) {
      setTimeout(() => launchSparkles(), i * 300)
    }

    // 3. EARTHQUAKE SHAKE ENTIRE PAGE
    document.body.style.transition = 'transform 0.8s'
    const shakes = [15, -12, 10, -8, 6, -4, 2]
    shakes.forEach((px, i) => {
      setTimeout(() => {
        document.body.style.transform = `translateX(${px}px)`
      }, i * 80)
    })
    setTimeout(() => {
      document.body.style.transform = ''
    }, 80 * shakes.length)

    // 4. MONUMENTAL "LEVEL XX" TEXT — RISES FROM HELL TO HEAVEN
    const holyText = document.createElement('div')
    holyText.innerHTML = `
      <div style="font-size:14rem; font-weight:900; 
                  background:linear-gradient(0deg, #facc15, #fff, #f43f5e, #c084fc);
                  -webkit-background-clip:text; background-clip:text; color:transparent;
                  text-shadow: 0 0 80px #fff, 0 0 160px #facc15;
                  letter-spacing:-0.5rem;">
        LEVEL ${newLevel}
      </div>
      <div style="font-size:5rem; margin-top:2rem; 
                  background:linear-gradient(to right, #34d399, #22d3ee);
                  -webkit-background-clip:text; background-clip:text; color:transparent;
                  text-shadow:0 0 60px #34d399;">
        ${getTitle(newLevel).toUpperCase()}
      </div>
      <div style="font-size:3rem; margin-top:1rem; color:#fbbf24; opacity:0.9;">
        HAS BEEN ACHIEVED!
      </div>
    `
    Object.assign(holyText.style, {
      position: 'fixed',
      top: '60%',
      left: '50%',
      transform: 'translate(-50%, -50%) scale(0.3)',
      pointerEvents: 'none',
      zIndex: '99999999',
      textAlign: 'center',
      opacity: '0',
      filter: 'blur(10px)'
    })
    document.body.appendChild(holyText)

    // Dramatic entrance
    requestAnimationFrame(() => {
      holyText.style.transition = 'all 2.8s cubic-bezier(0.22, 1, 0.36, 1)'
      holyText.style.opacity = '1'
      holyText.style.filter = 'blur(0)'
      holyText.style.transform = 'translate(-50%, -50%) scale(1.1)'
    })
    setTimeout(() => {
      holyText.style.transition = 'all 2s'
      holyText.style.transform = 'translate(-50%, -50%) scale(0.9)'
      holyText.style.opacity = '0'
      setTimeout(() => holyText.remove(), 2000)
    }, 3000)

    // 5. TREE VIOLENTLY EXPLODES UPWARD + NEW BRANCHES BURST OUT
    if (treeRef.current) {
      playSoundEffect('treeGrow', 0.6)
      treeRef.current.style.transition = 'transform 0.6s ease-out'
      treeRef.current.style.transform = 'translateY(-120px) scale(1.4)'
      setTimeout(() => {
        if (treeRef.current) {
          treeRef.current.style.transition = 'transform 1.8s cubic-bezier(0.2, 0.8, 0.2, 1)'
          treeRef.current.style.transform = 'translateY(0) scale(1)'
        }
      }, 600)
    }

    // 6. FRUITS RAIN FROM HEAVEN
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        floatingScore(
          newLevel > 20 ? 100 : newLevel * 5,
          window.innerWidth / 2 + Math.random() * 600 - 300,
          -100
        )
      }, i * 80)
    }

    // 7. SCREEN-SHAKING PARTICLE RING EXPLOSION
    for (let angle = 0; angle < 360; angle += 15) {
      setTimeout(() => {
        const x = window.innerWidth / 2 + Math.cos((angle * Math.PI) / 180) * 100
        const y = window.innerHeight / 2 + Math.sin((angle * Math.PI) / 180) * 100
        // Create sparkle at specific position
        const sparkle = document.createElement('div')
        sparkle.style.position = 'fixed'
        sparkle.style.left = x + 'px'
        sparkle.style.top = y + 'px'
        sparkle.style.width = '20px'
        sparkle.style.height = '20px'
        sparkle.style.background = 'radial-gradient(circle, #fff, #facc15, transparent)'
        sparkle.style.borderRadius = '50%'
        sparkle.style.pointerEvents = 'none'
        sparkle.style.zIndex = '999999'
        sparkle.style.opacity = '0'
        sparkle.style.transform = 'scale(0)'
        document.body.appendChild(sparkle)
        
        requestAnimationFrame(() => {
          sparkle.style.transition = 'all 0.6s ease-out'
          sparkle.style.opacity = '1'
          sparkle.style.transform = 'scale(1)'
          setTimeout(() => {
            sparkle.style.opacity = '0'
            sparkle.style.transform = 'scale(2) translateY(-50px)'
            setTimeout(() => sparkle.remove(), 600)
          }, 300)
        })
      }, angle)
    }
  }

  // Load user progress from Supabase
  const loadUserProgress = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Use type assertion since user_progress table may not be in generated types
      let { data, error } = await (supabase
        .from('profiles') as any)
        .select('user_id, xp, level, fruits, streak, last_active')
        .eq('user_id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // First time – create row with 50 XP - use profiles table
        const { data: newData, error: insertError } = await (supabase
          .from('profiles') as any)
          .update({ xp: 50, level: 1, fruits: 0, streak: 1 })
          .eq('user_id', user.id)
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
        lastLevelRef.current = data.level || 1
        const progressData: UserProgress = {
          user_id: data.user_id || user.id,
          xp: data.xp || 0,
          level: data.level || 1,
          fruits: data.fruits || 0,
          streak: data.streak || 0,
          last_active: data.last_active || new Date().toISOString()
        }
        setProgress(progressData)
        setPreviousLevel(progressData.level)
        updateTree(progressData)
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
    const oldXp = progress?.xp || 0
    
    setProgress(data)
    
    // Trigger animations on XP increase
    if (data.xp > oldXp) {
      const xpGained = data.xp - oldXp
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
          className="max-w-2xl w-full max-h-[90vh] bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 rounded-3xl shadow-4xl px-10 pb-10 pt-[188px] text-white relative overflow-y-auto"
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
          <h2 className="text-6xl font-black text-center mb-6 bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent" style={{ marginTop: '-188px' }}>
            Your Progress
          </h2>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === "tree" && (
              <motion.div
                key="tree"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
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

          {/* User Stats Header - Moved below tree */}
          {userPoints && (
            <div className="mt-12 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400">{userPoints.total_points}</div>
                  <div className="text-sm text-white/70">Total Points</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-400">Level {userPoints.level}</div>
                  <div className="text-sm text-white/70">Current Level</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-4">
                  <div className="text-center mb-2">
                    <div className="text-lg font-semibold text-white">Next Level</div>
                    <div className="text-sm text-white/70">
                      {userPoints.points_to_next_level} points to go
                    </div>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${userPoints.points_to_next_level > 0 ? 
                          ((100 - (userPoints.points_to_next_level / 100) * 100)) : 100
                        }%` 
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-2xl">Loading your orchard...</div>
            </div>
          )}
              </motion.div>
            )}

            {activeTab === "achievements" && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 max-h-[60vh] overflow-y-auto"
              >
                {achievements.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-16 w-16 text-white/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white">No achievements yet</h3>
                    <p className="text-white/60">Start creating orchards and supporting others to earn your first achievements!</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {achievements.map((achievement, index) => (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="border-l-4 border-l-yellow-400 bg-white/10 border-white/20">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-4">
                              <div className="p-2 bg-yellow-400/20 rounded-full">
                                <Award className="h-6 w-6 text-yellow-400" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-white">{achievement.title}</h4>
                                <p className="text-sm text-white/70">{achievement.description}</p>
                                <div className="flex items-center mt-1">
                                  <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30">
                                    +{achievement.points_awarded} points
                                  </Badge>
                                  <span className="text-xs text-white/50 ml-2">
                                    {new Date(achievement.unlocked_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 max-h-[60vh] overflow-y-auto"
              >
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-16 w-16 text-white/40 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white">No notifications</h3>
                    <p className="text-white/60">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-white/10 ${
                          !notification.is_read ? 'bg-yellow-400/10 border-yellow-400/30' : 'bg-white/5 border-white/20'
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-1 rounded-full ${!notification.is_read ? 'bg-yellow-400' : 'bg-white/20'}`}>
                            {notification.is_read ? (
                              <CheckCircle className="h-3 w-3 text-white/60" />
                            ) : (
                              <div className="h-3 w-3 bg-white rounded-full" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{notification.title}</h4>
                            <p className="text-sm text-white/70">{notification.message}</p>
                            <p className="text-xs text-white/50 mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabs - Moved to bottom */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <div className="flex gap-3 justify-center">
              <motion.button
                onClick={() => setActiveTab("tree")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
                  activeTab === "tree"
                    ? "bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-white border-2 border-emerald-400/50 shadow-lg shadow-emerald-500/20"
                    : "bg-white/5 text-white/70 border-2 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-xl">🌳</span>
                <span>Tree</span>
                {activeTab === "tree" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
              
              <motion.button
                onClick={() => setActiveTab("achievements")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
                  activeTab === "achievements"
                    ? "bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-white border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/20"
                    : "bg-white/5 text-white/70 border-2 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Award className="h-5 w-5" />
                <span>Achievements</span>
                {achievements.length > 0 && (
                  <Badge className="ml-1 bg-yellow-400/20 text-yellow-300 border-yellow-400/30">
                    {achievements.length}
                  </Badge>
                )}
                {activeTab === "achievements" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
              
              <motion.button
                onClick={() => setActiveTab("notifications")}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
                  activeTab === "notifications"
                    ? "bg-gradient-to-r from-pink-500/30 to-rose-500/30 text-white border-2 border-pink-400/50 shadow-lg shadow-pink-500/20"
                    : "bg-white/5 text-white/70 border-2 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
                {unreadNotifications.length > 0 && (
                  <Badge className="ml-1 bg-pink-500 text-white border-pink-400/50 animate-pulse">
                    {unreadNotifications.length}
                  </Badge>
                )}
                {activeTab === "notifications" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-rose-500/20 rounded-xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </motion.button>
            </div>
          </div>
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
