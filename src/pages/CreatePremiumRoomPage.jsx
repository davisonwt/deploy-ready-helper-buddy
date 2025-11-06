import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Briefcase, Radio as RadioIcon, Megaphone, MessageSquare } from 'lucide-react';

const PURPOSES = [
  { value: 'classroom', label: 'Classroom / Educational', icon: GraduationCap, desc: 'Interactive learning sessions' },
  { value: 'seminar', label: 'Seminar / Workshop', icon: Users, desc: 'Professional development' },
  { value: 'training', label: 'Training Session', icon: Briefcase, desc: 'Skill development' },
  { value: 'podcast', label: 'Podcast Recording', icon: RadioIcon, desc: 'Live podcast sessions' },
  { value: 'marketing', label: 'Marketing / Product Demo', icon: Megaphone, desc: 'Promote products or services' },
  { value: 'general', label: 'General Discussion', icon: MessageSquare, desc: 'Community conversations' },
];

export function CreatePremiumRoomPage() {
  const [selected, setSelected] = useState('general');

  useEffect(() => {
    document.title = 'Create Premium Room | Purpose Selection';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Select the purpose for your premium room: classroom, seminar, training, podcast, marketing, or general discussion.');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Room Purpose</CardTitle>
                <CardDescription>Choose what you want to create. You can change this later.</CardDescription>
              </div>
              <Badge variant="outline">Step 1 of 1</Badge>
            </div>
          </CardHeader>
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

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" asChild>
                <Link to="/premium-rooms">Cancel</Link>
              </Button>
              <Button asChild>
                <Link to={`/chatapp?create=premium-room&purpose=${selected}`}>Continue</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

