import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Gift, Target } from "lucide-react"

const GamificationDashboard = () => {
  const { user } = useAuth()

  const { data: userPoints } = useQuery({
    queryKey: ['user-points', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') throw error
      
      if (!data) {
        // Initialize user points
        const { data: newData, error: insertError } = await supabase
          .from('user_points')
          .insert({ 
            user_id: user.id,
            total_points: 0,
            level: 1,
            points_to_next_level: 100
          })
          .select()
          .single()
        
        if (insertError) throw insertError
        return newData
      }
      
      return data
    },
    enabled: !!user,
  })

  const { data: userAchievements = [] } = useQuery({
    queryKey: ['user-achievements', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })

  const { data: availableAchievements = [] } = useQuery({
    queryKey: ['available-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('available_achievements')
        .select('*')
        .eq('is_active', true)
        .order('points_awarded', { ascending: false })
      
      if (error) throw error
      return data || []
    },
  })

  const achievements = availableAchievements.map(achievement => {
    const unlocked = userAchievements.find(ua => ua.achievement_type === achievement.achievement_type)
    return {
      ...achievement,
      unlocked: !!unlocked,
      unlocked_at: unlocked?.unlocked_at
    }
  })

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'trophy': return Trophy
      case 'star': return Star
      case 'gift': return Gift
      case 'target': return Target
      default: return Trophy
    }
  }

  const levelProgress = userPoints ? (() => {
    const currentLevelThreshold = 50 * ((userPoints.level - 1) * (userPoints.level - 1));
    const nextLevelThreshold = 50 * (userPoints.level * userPoints.level);
    const range = nextLevelThreshold - currentLevelThreshold;
    return range > 0 ? ((userPoints.total_points - currentLevelThreshold) / range) * 100 : 0;
  })() : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Achievements & Progress</h1>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          Level {userPoints?.level || 1}
        </Badge>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Total Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {userPoints?.total_points || 0}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to Level {(userPoints?.level || 1) + 1}</span>
                <span>{userPoints?.points_to_next_level || 100} points needed</span>
              </div>
              <Progress value={levelProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-2">
              {unlockedCount}/{totalCount}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completed</span>
                <span>{Math.round((unlockedCount / totalCount) * 100)}%</span>
              </div>
              <Progress value={(unlockedCount / totalCount) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">All Achievements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement) => {
            const IconComponent = getIconComponent(achievement.icon || 'trophy')
            
            return (
              <Card 
                key={achievement.id} 
                className={`transition-all ${
                  achievement.unlocked 
                    ? 'border-primary bg-primary/5' 
                    : 'opacity-60 hover:opacity-80'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <IconComponent 
                      className={`h-6 w-6 ${
                        achievement.unlocked ? 'text-primary' : 'text-muted-foreground'
                      }`} 
                    />
                    <Badge 
                      variant={achievement.unlocked ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {achievement.points_awarded} pts
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{achievement.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {achievement.description}
                  </p>
                  {achievement.unlocked && achievement.unlocked_at && (
                    <p className="text-xs text-primary font-medium">
                      Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default GamificationDashboard