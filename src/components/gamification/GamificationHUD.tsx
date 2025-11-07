import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Trophy, Award, Target, Bell, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useGamification } from "@/hooks/useGamification"

interface GamificationHUDProps {
  isVisible: boolean
  onClose: () => void
}

export function GamificationHUD({ isVisible, onClose }: GamificationHUDProps) {
  // Defensive: catch any hook errors
  let achievements: any[] = []
  let userPoints = null
  let notifications: any[] = []
  let markNotificationAsRead = async (id: string) => {}
  
  try {
    const gamification = useGamification()
    achievements = gamification.achievements
    userPoints = gamification.userPoints
    notifications = gamification.notifications
    markNotificationAsRead = gamification.markNotificationAsRead
  } catch (error) {
    console.warn('GamificationHUD: hook error', error)
    return null // Don't render if hooks fail
  }
  
  const [activeTab, setActiveTab] = useState<"achievements" | "leaderboard" | "notifications">("achievements")

  const unreadNotifications = notifications.filter(n => !n.is_read)

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id)
    }
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="relative max-w-4xl max-h-[80vh] w-full mx-4 bg-background rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center space-x-4">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Your Progress</h2>
              <p className="text-muted-foreground">Track your journey in the Sow2Grow community</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover-scale"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* User Stats Header */}
        {userPoints && (
          <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-primary">{userPoints.total_points}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-secondary">Level {userPoints.level}</div>
                  <div className="text-sm text-muted-foreground">Current Level</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center mb-2">
                    <div className="text-lg font-semibold">Next Level</div>
                    <div className="text-sm text-muted-foreground">
                      {userPoints.points_to_next_level} points to go
                    </div>
                  </div>
                  <Progress 
                    value={userPoints.points_to_next_level > 0 ? 
                      ((100 - (userPoints.points_to_next_level / 100) * 100)) : 100
                    } 
                    className="h-2"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b">
          <Button
            variant={activeTab === "achievements" ? "default" : "ghost"}
            onClick={() => setActiveTab("achievements")}
            className="rounded-none"
          >
            <Award className="h-4 w-4 mr-2" />
            Achievements ({achievements.length})
          </Button>
          <Button
            variant={activeTab === "notifications" ? "default" : "ghost"}
            onClick={() => setActiveTab("notifications")}
            className="rounded-none relative"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs">
                {unreadNotifications.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === "achievements" && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {achievements.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No achievements yet</h3>
                    <p className="text-muted-foreground">Start creating orchards and supporting others to earn your first achievements!</p>
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
                        <Card className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-4">
                              <div className="p-2 bg-primary/10 rounded-full">
                                <Award className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold">{achievement.title}</h4>
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                                <div className="flex items-center mt-1">
                                  <Badge variant="secondary">+{achievement.points_awarded} points</Badge>
                                  <span className="text-xs text-muted-foreground ml-2">
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
                className="space-y-4"
              >
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No notifications</h3>
                    <p className="text-muted-foreground">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification, index) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                          !notification.is_read ? 'bg-primary/5 border-primary/20' : 'bg-background'
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-1 rounded-full ${!notification.is_read ? 'bg-primary' : 'bg-muted'}`}>
                            {notification.is_read ? (
                              <CheckCircle className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <div className="h-3 w-3 bg-white rounded-full" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
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
        </div>
      </motion.div>
    </motion.div>
  )
}