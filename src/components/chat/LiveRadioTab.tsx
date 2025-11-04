import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Radio, Calendar } from 'lucide-react';

interface LiveRadioTabProps {
  searchQuery: string;
}

export const LiveRadioTab = ({ searchQuery }: LiveRadioTabProps) => {
  return (
    <div className="space-y-4">
      <Card className="border-emerald-200">
        <CardContent className="py-12 text-center space-y-4">
          <div className="h-20 w-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <Radio className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">
            Live Radio Shows
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Discover and join live radio broadcasts from community members. 
            Apply for your own 2-hour slot to share music, podcasts, or discussions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => window.location.href = '/radio-slot-application'}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Apply for Radio Slot
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/grove-station'}
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            >
              <Radio className="h-4 w-4 mr-2" />
              Listen to Grove Station
            </Button>
          </div>
          
          {/* Placeholder for future live shows list */}
          <div className="mt-8 pt-8 border-t border-emerald-200">
            <p className="text-sm text-gray-500 italic">
              Live radio shows will appear here once available
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
