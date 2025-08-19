import { useState } from "react"
import { motion } from "framer-motion"
import { Trophy, Bell, Award, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useGamification } from "@/hooks/useGamification"

interface GamificationFloatingButtonProps {
  onToggleHUD: () => void
}

export function GamificationFloatingButton({ onToggleHUD }: GamificationFloatingButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { userPoints, notifications } = useGamification()

  const unreadNotifications = notifications.filter(n => !n.is_read).length

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-40"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Button
        onClick={onToggleHUD}
        size="lg"
        className="relative h-14 w-14 rounded-full bg-gradient-to-r from-primary to-secondary shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Trophy className="h-6 w-6" />
        
        {/* Notification Badge */}
        {unreadNotifications > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-6 w-6 p-0 text-xs animate-pulse"
          >
            {unreadNotifications}
          </Badge>
        )}

        {/* Level Badge */}
        {userPoints && (
          <Badge 
            variant="secondary" 
            className="absolute -bottom-2 -left-2 h-5 px-2 text-xs font-bold"
          >
            L{userPoints.level}
          </Badge>
        )}
      </Button>

      {/* Hover Tooltip */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 20 }}
        className="absolute right-16 top-1/2 -translate-y-1/2 bg-popover border rounded-lg p-3 shadow-lg min-w-48"
        style={{ pointerEvents: isHovered ? 'auto' : 'none' }}
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Award className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Your Progress</span>
          </div>
          {userPoints && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Level {userPoints.level} • {userPoints.total_points} points</div>
              <div>{userPoints.points_to_next_level} points to next level</div>
            </div>
          )}
          {unreadNotifications > 0 && (
            <div className="flex items-center space-x-1 text-xs text-destructive">
              <Bell className="h-3 w-3" />
              <span>{unreadNotifications} new notifications</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Floating Stars Animation */}
      {userPoints && userPoints.total_points > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                y: [0, -20, -40],
                x: [0, Math.random() * 20 - 10, Math.random() * 40 - 20]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.7,
                repeatDelay: 3
              }}
              style={{
                left: '50%',
                top: '50%',
              }}
            >
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}