import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSkillDropHostApplication } from '@/hooks/useSkillDropHostApplication';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Clock, CheckCircle, XCircle, Send } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_TYPES = [
  { value: 'sower', label: 'Sower (Creator)' },
  { value: 'grower', label: 'Grower (Investor)' },
  { value: 'driver', label: 'Community Driver' },
  { value: 'whisperer', label: 'Whisperer (Referrer)' },
  { value: 'service_provider', label: 'Service Provider' },
];

export const SkillDropHostApplicationForm: React.FC<Props> = ({ open, onOpenChange }) => {
  const { application, loading, submitting, submitApplication } = useSkillDropHostApplication();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    full_name: '',
    role_type: '',
    expertise_area: '',
    description: '',
    experience_summary: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role_type) {
      toast({ title: 'Missing Role', description: 'Please select your role type.', variant: 'destructive' });
      return;
    }
    const result = await submitApplication(formData);
    if (result.success) {
      toast({ title: '✅ Application Submitted', description: 'Your SkillDrop host application is under review.' });
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  if (loading) return null;

  // Show status if already applied
  if (application) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-card bg-background/95 border-primary/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              SkillDrop Host Application
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6 space-y-4">
            {application.status === 'pending' && (
              <>
                <Clock className="w-12 h-12 text-amber-500 mx-auto" />
                <Badge variant="outline" className="text-amber-600 border-amber-400">Pending Review</Badge>
                <p className="text-muted-foreground text-sm">Your application is being reviewed by a GoSat admin. You'll be notified once approved.</p>
              </>
            )}
            {application.status === 'approved' && (
              <>
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                <Badge className="bg-emerald-600">Approved ✓</Badge>
                <p className="text-muted-foreground text-sm">You're approved to host SkillDrop sessions! Go ahead and schedule your first session.</p>
              </>
            )}
            {application.status === 'rejected' && (
              <>
                <XCircle className="w-12 h-12 text-destructive mx-auto" />
                <Badge variant="destructive">Rejected</Badge>
                {application.rejection_reason && (
                  <p className="text-muted-foreground text-sm">Reason: {application.rejection_reason}</p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-background/95 border-primary/20 max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <GraduationCap className="w-6 h-6 text-primary" />
            Apply to Host SkillDrop Sessions
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Become a SkillDrop host and earn <span className="font-bold text-primary">85% of 5 USDT/month</span> per subscriber. 
          10% goes to tithing, 5% admin fee.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} required />
          </div>
          <div>
            <Label>Your Role</Label>
            <Select value={formData.role_type} onValueChange={v => setFormData(p => ({ ...p, role_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
              <SelectContent>
                {ROLE_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="expertise">Area of Expertise</Label>
            <Input id="expertise" value={formData.expertise_area} onChange={e => setFormData(p => ({ ...p, expertise_area: e.target.value }))} placeholder="e.g., Scriptural Studies, Farming, Web Development" required />
          </div>
          <div>
            <Label htmlFor="desc">What will you teach?</Label>
            <Textarea id="desc" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Describe the topics and sessions you plan to host..." rows={3} />
          </div>
          <div>
            <Label htmlFor="exp">Experience Summary</Label>
            <Textarea id="exp" value={formData.experience_summary} onChange={e => setFormData(p => ({ ...p, experience_summary: e.target.value }))} placeholder="Briefly describe your relevant experience..." rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
