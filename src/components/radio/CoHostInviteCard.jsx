import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Calendar, 
  Clock, 
  Radio, 
  CheckCircle, 
  XCircle,
  Loader2,
  Upload,
  Music,
  FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import DJMusicUpload from '@/components/radio/DJMusicUpload';
import { Textarea } from '@/components/ui/textarea';

export function CoHostInviteCard({ invite, onUpdate }) {
  const [responding, setResponding] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [notes, setNotes] = useState('');

  const handleResponse = async (accepted) => {
    setResponding(true);
    try {
      const { error } = await supabase
        .from('radio_co_host_invites')
        .update({
          status: accepted ? 'accepted' : 'declined',
          responded_at: new Date().toISOString(),
          co_host_notes: notes || null
        })
        .eq('id', invite.id);

      if (error) throw error;

      toast.success(accepted ? '✅ Accepted! You\'re now a co-host' : 'Invitation declined');
      onUpdate?.();
    } catch (error) {
      console.error('Error responding to invite:', error);
      toast.error('Failed to respond: ' + error.message);
    } finally {
      setResponding(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Co-Host Invitation
          </CardTitle>
          <Badge variant={invite.status === 'pending' ? 'default' : 'secondary'}>
            {invite.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show Details */}
        <div className="space-y-2">
          <h3 className="font-bold">{invite.radio_shows?.show_name || 'Radio Show'}</h3>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(parseISO(invite.radio_schedule?.start_time), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(parseISO(invite.radio_schedule?.start_time), 'h:mm a')} - 
              {format(parseISO(invite.radio_schedule?.end_time), 'h:mm a')}
            </div>
          </div>

          {invite.radio_shows?.description && (
            <p className="text-sm text-muted-foreground">{invite.radio_shows.description}</p>
          )}

          {invite.invitation_message && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm italic">"{invite.invitation_message}"</p>
            </div>
          )}
        </div>

        {/* Response Actions */}
        {invite.status === 'pending' && (
          <div className="space-y-3">
            <Textarea
              placeholder="Add notes for the host (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
            
            <div className="flex gap-2">
              <Button
                onClick={() => handleResponse(true)}
                disabled={responding}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {responding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept & Join as Co-Host
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResponse(false)}
                disabled={responding}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
          </div>
        )}

        {/* Upload Section for Accepted Invites */}
        {invite.status === 'accepted' && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold text-sm">Prepare for Your Show</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(!showUpload)}
              >
                <Music className="h-4 w-4 mr-2" />
                Upload Music
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Upload Documents
              </Button>
            </div>

            {showUpload && (
              <div className="mt-4">
                <DJMusicUpload
                  djId={invite.co_host_dj_id}
                  onUploadComplete={() => {
                    toast.success('Music uploaded successfully!');
                    setShowUpload(false);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
