import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, Search, Plus, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const PremiumRoomsLanding: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState('');

  // Basic SEO tags for this page
  React.useEffect(() => {
    document.title = 'Premium Rooms & Courses | sow2grow';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Create premium rooms and courses: classroom, seminar, training, podcast, marketing demo, or general discussion.'
      );
    }
  }, []);

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
          <Button asChild>
            <Link to="/create-premium-room">
              <Plus className="h-4 w-4 mr-2" />
              Create Room
            </Link>
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
            aria-label="Search premium rooms"
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
            <h3 className="text-xl font-semibold">Premium Rooms & Courses</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create structured courses and classrooms with premium content. 
              Share knowledge through modules, documents, videos, and interactive discussions.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button asChild>
                <Link to="/create-premium-room">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Premium Room
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="#">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Browse Courses
                </Link>
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

export default PremiumRoomsLanding;
