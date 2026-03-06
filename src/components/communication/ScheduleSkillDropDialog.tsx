import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ScheduleSkillDropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  topicId?: string;
  topicTitle?: string;
}

export const ScheduleSkillDropDialog: React.FC<ScheduleSkillDropDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  topicId,
  topicTitle,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: topicTitle ? `SkillDrop: ${topicTitle}` : '',
    description: '',
    scheduled_at: '',
    duration_minutes: 45,
  });

  // Update title when topicTitle changes
  React.useEffect(() => {
    if (topicTitle) {
      setFormData(prev => ({ ...prev, title: `SkillDrop: ${topicTitle}` }));
    }
  }, [topicTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('skilldrop_sessions' as any).insert({
        title: formData.title,
        description: formData.description,
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        duration_minutes: formData.duration_minutes,
        presenter_id: user.id,
        status: 'scheduled',
        attendees_count: 0,
        topic_id: topicId || null,
      } as any);

      if (error) throw error;

      toast({
        title: 'SkillDrop Scheduled',
        description: 'Your SkillDrop session has been scheduled successfully!',
      });

      onOpenChange(false);
      onSuccess();
      setFormData({
        title: '',
        description: '',
        scheduled_at: '',
        duration_minutes: 45,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-background/95 border-primary/20 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Schedule SkillDrop</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Session Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Scriptural Study: The Time Is Near"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What topics will be covered in this session?"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduled_at">Date & Time</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                min={30}
                max={180}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule SkillDrop'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};