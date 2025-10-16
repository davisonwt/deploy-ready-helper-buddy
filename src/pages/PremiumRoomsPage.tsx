import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, Search, Plus, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PremiumRoomsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <GraduationCap className="h-16 w-16 mx-auto text-primary mb-4" />
            <p className="text-muted-foreground mb-4">Please log in to access premium rooms.</p>
            <Button onClick={() => navigate('/login')}>Log In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Premium Rooms & Courses</h1>
            <p className="text-sm text-muted-foreground">
              Create structured courses and classrooms with premium content
            </p>
          </div>
          <Button onClick={() => navigate('/create-premium-room')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Room
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search premium rooms and courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="h-[calc(100vh-300px)]">
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center space-y-4">
            <div className="h-20 w-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">
              Premium Rooms & Courses
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create structured courses and classrooms with premium content. 
              Share knowledge through modules, documents, videos, and interactive discussions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button onClick={() => navigate('/create-premium-room')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Premium Room
              </Button>
              <Button variant="outline">
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Courses
              </Button>
            </div>
            
            {/* Placeholder for future premium rooms list */}
            <div className="mt-8 pt-8 border-t">
              <p className="text-sm text-muted-foreground italic">
                Premium rooms and courses will appear here once created
              </p>
            </div>
          </CardContent>
        </Card>
      </ScrollArea>
    </div>
  );
};

export default PremiumRoomsPage;
