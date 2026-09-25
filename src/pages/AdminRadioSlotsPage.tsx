import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RadioSlotsAdminPanel from '@/components/radio/RadioSlotsAdminPanel';

/** /admin/radio -- Gosat's Boardroom radio hotspot lands here. admin, gosat and radio_admin. */
export default function AdminRadioSlotsPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link to="/stall/gosatsboardroom">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Boardroom
          </Link>
        </Button>
        <RadioSlotsAdminPanel />
      </div>
    </div>
  );
}
