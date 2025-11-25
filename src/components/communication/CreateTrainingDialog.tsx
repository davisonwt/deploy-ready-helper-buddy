import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface CreateTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateTrainingDialog: React.FC<CreateTrainingDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'beginner',
    xp_reward: 100,
    modules_count: 5,
    category: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    try {
      // In a real implementation, this would save to a training_courses table
      toast({
        title: 'Training Session Created',
        description: 'Your training course has been created successfully!',
      });

      onOpenChange(false);
      onSuccess();
      setStep(1);
      setFormData({
        title: '',
        description: '',
        difficulty: 'beginner',
        xp_reward: 100,
        modules_count: 5,
        category: '',
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
          <DialogTitle className="text-2xl">Create Training Session - Step {step}/3</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Mastering Community Building"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What will students learn?"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Leadership, Technical, Communication, etc."
                  required
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="modules_count">Number of Modules</Label>
                <Input
                  id="modules_count"
                  type="number"
                  value={formData.modules_count}
                  onChange={(e) => setFormData({ ...formData, modules_count: parseInt(e.target.value) })}
                  min={1}
                  max={50}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Each module should be a distinct learning unit
                </p>
              </div>

              <div>
                <Label htmlFor="xp_reward">XP Reward</Label>
                <Input
                  id="xp_reward"
                  type="number"
                  value={formData.xp_reward}
                  onChange={(e) => setFormData({ ...formData, xp_reward: parseInt(e.target.value) })}
                  min={10}
                  max={1000}
                  step={10}
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  XP awarded upon course completion
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Review Your Course</h3>
              <div className="space-y-2 p-4 rounded-lg glass-panel">
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <p className="font-semibold">{formData.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p>{formData.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Difficulty:</span>
                  <p className="capitalize">{formData.difficulty}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Modules:</span>
                  <p>{formData.modules_count}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">XP Reward:</span>
                  <p>{formData.xp_reward} XP</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (step > 1) setStep(step - 1);
                else onOpenChange(false);
              }}
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading}>
              {step < 3 ? 'Next' : loading ? 'Creating...' : 'Create Course'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
