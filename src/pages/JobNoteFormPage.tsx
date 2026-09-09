import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBooksBusiness } from '@/hooks/useBooksBusiness';
import { createJobNote } from '@/hooks/useJobInvoicing';

export default function JobNoteFormPage() {
  const navigate = useNavigate();
  const { current, loading: bizLoading } = useBooksBusiness();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateNeeded, setDateNeeded] = useState('');
  const [location, setLocation] = useState('');
  const [notesToSupplier, setNotesToSupplier] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!current?.id) return;
    if (!title.trim()) return toast.error('Give the job a title');
    setSaving(true);
    try {
      const job = await createJobNote({
        businessId: current.id,
        title: title.trim(),
        description: description.trim() || null,
        dateNeeded: dateNeeded || null,
        location: location.trim() || null,
        notesToSupplier: notesToSupplier.trim() || null,
      });
      toast.success('Job created — a chat room was set up for it');
      navigate(`/books/jobs/${job.id}`);
    } catch (e: any) {
      toast.error(e?.message || 'Could not create the job');
    } finally {
      setSaving(false);
    }
  };

  if (bizLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-10 text-muted-foreground">Loading…</div>;
  }
  if (!current) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-muted-foreground">Set up a business in your profile first.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/books/invoicing')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoicing
      </Button>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="text-base">New job note</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="job-title">Title</Label>
            <Input id="job-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Deck rebuild — Jane's Cafe" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-desc">Description</Label>
            <Textarea id="job-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="job-date">Date needed</Label>
              <Input id="job-date" type="date" value={dateNeeded} onChange={(e) => setDateNeeded(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-location">Location</Label>
              <Input id="job-location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-supplier-notes">Notes to supplier (optional)</Label>
            <Textarea id="job-supplier-notes" value={notesToSupplier} onChange={(e) => setNotesToSupplier(e.target.value)} rows={2} />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create job
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
