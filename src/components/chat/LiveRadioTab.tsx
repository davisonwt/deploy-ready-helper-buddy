import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Radio, Mic, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LiveRadioTabProps {
  searchQuery: string;
}

export const LiveRadioTab = ({ searchQuery }: LiveRadioTabProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      {/* Apply for Radio Slot */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardContent className="py-8 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Mic className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Become a Radio Host
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Apply for a 2-hour live radio slot. Share your voice, music, and message with the community on The Set-Apart Heretics AOD Frequencies.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button 
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => navigate('/radio-slot-application')}
            >
              <Mic className="h-4 w-4 mr-2" />
              Apply for Radio Slot
            </Button>
            <Button 
              variant="outline"
              className="border-orange-600 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              onClick={() => navigate('/radio-management')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              View Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Shows Placeholder */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <Calendar className="h-5 w-5" />
            Upcoming Live Shows
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Live show schedule will appear here
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
