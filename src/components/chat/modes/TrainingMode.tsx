import React from 'react';
import { motion } from 'framer-motion';
import { Dumbbell, Trophy, BookOpen, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export const TrainingMode: React.FC = () => {
  // Mock training data - will be replaced with real data
  const trainingCourses = [
    {
      id: 1,
      title: 'Community Building Fundamentals',
      description: 'Learn the basics of creating and managing thriving communities',
      progress: 65,
      xpReward: 500,
      lessonsCompleted: 13,
      totalLessons: 20,
      category: 'Community',
    },
    {
      id: 2,
      title: 'Advanced Communication Skills',
      description: 'Master the art of effective communication in digital spaces',
      progress: 30,
      xpReward: 750,
      lessonsCompleted: 6,
      totalLessons: 20,
      category: 'Communication',
    },
    {
      id: 3,
      title: 'Leadership & Mentorship',
      description: 'Develop leadership skills and learn to mentor others',
      progress: 0,
      xpReward: 1000,
      lessonsCompleted: 0,
      totalLessons: 25,
      category: 'Leadership',
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5" />
            Training Sessions
          </CardTitle>
          <CardDescription>
            Complete courses, earn XP points, and unlock achievements
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total XP</p>
                <p className="text-2xl font-bold">2,450</p>
              </div>
              <Trophy className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Courses Started</p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <BookOpen className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">48%</p>
              </div>
              <Target className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Courses */}
      <div className="space-y-4">
        {trainingCourses.map((course) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </div>
                  <Badge variant="secondary">{course.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-2" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {course.lessonsCompleted} / {course.totalLessons} lessons
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-primary">
                      {course.xpReward} XP
                    </span>
                  </div>
                </div>

                {course.progress > 0 && (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <TrendingUp className="w-4 h-4" />
                    <span>Keep it up! You're making great progress</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Coming Soon Notice */}
      <Card className="glass-card border-primary/50">
        <CardContent className="flex items-center gap-3 py-4">
          <Dumbbell className="w-8 h-8 text-primary" />
          <div>
            <p className="font-semibold">Interactive Training Coming Soon</p>
            <p className="text-sm text-muted-foreground">
              Live training sessions, quizzes, and certification programs will be available soon
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
