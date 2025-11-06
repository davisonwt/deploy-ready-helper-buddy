import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Briefcase, Radio as RadioIcon, Megaphone, MessageSquare, ArrowLeft, CheckCircle } from 'lucide-react';

const PURPOSES = [
  { value: 'classroom', label: 'Classroom / Educational', icon: GraduationCap, desc: 'Interactive learning sessions' },
  { value: 'seminar', label: 'Seminar / Workshop', icon: Users, desc: 'Professional development' },
  { value: 'training', label: 'Training Session', icon: Briefcase, desc: 'Skill development' },
  { value: 'podcast', label: 'Podcast Recording', icon: RadioIcon, desc: 'Live podcast sessions' },
  { value: 'marketing', label: 'Marketing / Product Demo', icon: Megaphone, desc: 'Promote products or services' },
  { value: 'general', label: 'General Discussion', icon: MessageSquare, desc: 'Community conversations' },
];

export function CreatePremiumRoomPage() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    document.title = step === 0
      ? 'Create Premium Room | Select Purpose'
      : step === 1
      ? 'Create Premium Room | Details'
      : 'Create Premium Room | Review';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Create a premium room in a few steps: select purpose, add details, and review.');
  }, [step]);

  const purposeInfo = useMemo(() => PURPOSES.find(p => p.value === selected), [selected]);
  const canContinue = step === 0 ? !!selected : title.trim().length > 0; // require a title on step 2

  const goNext = () => setStep(s => Math.min(s + 1, 2));
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {step === 0 && 'Select Room Purpose'}
                  {step === 1 && 'Room Details'}
                  {step === 2 && 'Review & Create'}
                </CardTitle>
                <CardDescription>
                  {step === 0 && 'Choose what you want to create. You can change this later.'}
                  {step === 1 && 'Name your room and describe what it is about.'}
                  {step === 2 && 'Confirm your configuration before creating.'}
                </CardDescription>
              </div>
              <Badge variant="outline">Step {step + 1} of 3</Badge>
            </div>
          </CardHeader>

          {/* STEP 1: PURPOSE */}
          {step === 0 && (
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PURPOSES.map(({ value, label, icon: Icon, desc }) => {
                  const active = selected === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelected(value)}
                      className={`text-left rounded-lg border p-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                      }`}
                      aria-pressed={active}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="font-semibold text-foreground">{label}</div>
                      </div>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <Button variant="ghost" asChild>
                  <Link to="/premium-rooms">Cancel</Link>
                </Button>
                <Button onClick={goNext} disabled={!canContinue}>Continue</Button>
              </div>
            </CardContent>
          )}

          {/* STEP 2: DETAILS */}
          {step === 1 && (
            <CardContent>
              <div className="mb-4 p-3 rounded-md border bg-muted/30 text-sm">
                <div className="flex items-center gap-2">
                  {purposeInfo?.icon && (
                    <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                      {React.createElement(purposeInfo.icon, { className: 'h-4 w-4' })}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{purposeInfo?.label}</div>
                    <div className="text-muted-foreground">{purposeInfo?.desc}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="room-title" className="block text-sm font-medium text-foreground mb-1">Room title</label>
                  <Input id="room-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Intro to Urban Gardening" />
                </div>
                <div>
                  <label htmlFor="room-desc" className="block text-sm font-medium text-foreground mb-1">Description</label>
                  <Textarea id="room-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Describe what participants can expect..." />
                </div>
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <Button variant="outline" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={goNext} disabled={!canContinue}>Continue</Button>
              </div>
            </CardContent>
          )}

          {/* STEP 3: REVIEW */}
          {step === 2 && (
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 border rounded-md bg-card">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Purpose</div>
                    <div className="text-lg font-semibold">{purposeInfo?.label}</div>
                    <div className="text-sm text-muted-foreground">{purposeInfo?.desc}</div>
                  </div>
                </div>

                <div className="p-4 border rounded-md">
                  <div className="text-sm text-muted-foreground mb-1">Title</div>
                  <div className="text-foreground font-medium">{title || '—'}</div>
                </div>

                <div className="p-4 border rounded-md">
                  <div className="text-sm text-muted-foreground mb-1">Description</div>
                  <div className="text-foreground whitespace-pre-wrap">{description || '—'}</div>
                </div>
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <Button variant="outline" onClick={goBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                {/* Finalize: for now just return to listing; wiring to Supabase can be added next */}
                <Button asChild>
                  <Link to="/premium-rooms">Create Room</Link>
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
