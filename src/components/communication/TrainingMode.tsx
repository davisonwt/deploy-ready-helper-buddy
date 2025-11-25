import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Trophy, Star, TrendingUp, Plus, Lock, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CreateTrainingDialog } from './CreateTrainingDialog';

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  xp_reward: number;
  modules_count: number;
  completed_modules: number;
  is_locked: boolean;
}

export const TrainingMode: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [courses] = useState<Course[]>([
    {
      id: '1',
      title: 'Sower Fundamentals',
      description: 'Learn the basics of seed planting and community building',
      difficulty: 'beginner',
      xp_reward: 100,
      modules_count: 5,
      completed_modules: 0,
      is_locked: false,
    },
    {
      id: '2',
      title: 'Advanced Bestowing',
      description: 'Master the art of giving and supporting orchards',
      difficulty: 'intermediate',
      xp_reward: 250,
      modules_count: 8,
      completed_modules: 0,
      is_locked: false,
    },
    {
      id: '3',
      title: 'Community Leadership',
      description: 'Develop skills to lead and inspire your circles',
      difficulty: 'advanced',
      xp_reward: 500,
      modules_count: 12,
      completed_modules: 0,
      is_locked: true,
    },
  ]);

  useEffect(() => {
    loadUserProgress();
  }, [user]);

  const loadUserProgress = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('achievements')
        .select('xp_reward')
        .eq('user_id', user.id);

      const totalXP = data?.reduce((sum, achievement) => sum + (achievement.xp_reward || 0), 0) || 0;
      setUserXP(totalXP);
      setUserLevel(Math.floor(totalXP / 1000) + 1);
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  };

  const startCourse = (courseId: string) => {
    toast({
      title: 'Starting Course',
      description: 'Loading training modules...',
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-success border-success/30';
      case 'intermediate': return 'text-warning border-warning/30';
      case 'advanced': return 'text-destructive border-destructive/30';
      default: return 'text-primary border-primary/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with XP Stats */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Training Sessions</h2>
          <p className="text-white/80">Complete courses and earn XP to level up</p>
        </div>
        
        <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Create New Training
        </Button>
        
        <Card className="glass-card bg-transparent border border-primary/20 min-w-[200px]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-primary" />
              <div className="text-white">
                <div className="text-2xl font-bold">Level {userLevel}</div>
                <div className="text-xs text-white/70">{userXP} XP</div>
              </div>
            </div>
            <Progress value={(userXP % 1000) / 10} className="h-2" />
            <p className="text-xs text-white/70 mt-1">
              {1000 - (userXP % 1000)} XP to next level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Courses Grid */}
      <div className="grid gap-4">
        {courses.map((course, index) => {
          const progress = (course.completed_modules / course.modules_count) * 100;
          
          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`glass-card bg-transparent border border-primary/20 hover:border-primary/40 transition-all ${course.is_locked ? 'opacity-60' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-white">{course.title}</h3>
                        {course.is_locked && <Lock className="w-4 h-4 text-white/50" />}
                      </div>
                      <p className="text-white/80 mb-3">{course.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                          {course.difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-primary border-primary/30">
                          <Star className="w-3 h-3 mr-1" />
                          +{course.xp_reward} XP
                        </Badge>
                        <Badge variant="outline" className="text-white border-primary/30">
                          {course.modules_count} modules
                        </Badge>
                      </div>

                      {course.completed_modules > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm text-white/70 mb-1">
                            <span>Progress</span>
                            <span>{course.completed_modules}/{course.modules_count}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )}

                      <Button 
                        onClick={() => startCourse(course.id)}
                        disabled={course.is_locked}
                        className="gap-2"
                      >
                        {progress > 0 ? (
                          <>
                            <TrendingUp className="w-4 h-4" />
                            Continue
                          </>
                        ) : (
                          <>
                            <Dumbbell className="w-4 h-4" />
                            Start Course
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <CreateTrainingDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          toast({
            title: 'Success',
            description: 'Training session created successfully',
          });
        }}
      />
    </div>
  );
};