import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, Plus } from 'lucide-react';

interface PremiumRoomsTabProps {
  searchQuery: string;
}

export const PremiumRoomsTab = ({ searchQuery }: PremiumRoomsTabProps) => {
  return (
    <div className="space-y-4">
      <Card className="border-emerald-200">
        <CardContent className="py-12 text-center space-y-4">
          <div className="h-20 w-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <GraduationCap className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">
            Premium Rooms & Courses
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Create structured courses and classrooms with premium content. 
            Share knowledge through modules, documents, videos, and interactive discussions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => window.location.href = '/create-premium-room'}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Premium Room
            </Button>
            <Button 
              variant="outline"
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Courses
            </Button>
          </div>
          
          {/* Placeholder for future premium rooms list */}
          <div className="mt-8 pt-8 border-t border-emerald-200">
            <p className="text-sm text-gray-500 italic">
              Premium rooms and courses will appear here once created
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
