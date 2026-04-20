import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Loader2 } from 'lucide-react';

export default function AdminCreateUserPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [form, setForm] = useState({
    email: 'aboveandbeyond263@gmail.com',
    first_name: 'Frank',
    last_name: 'Weyers',
    phone: '(262) 909-9081',
    city: 'Slinger',
    country: 'USA',
    referrer_user_id: '432df4a7-07f1-4a5e-835c-a3c2806ce6c5', // amberwheeles@gmail.com
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { ...form, send_welcome: false },
      });
      if (error) throw error;
      setResult(data);
      toast({
        title: data?.success ? 'User created ✓' : 'Done',
        description: data?.email || 'See result below',
      });
    } catch (err: any) {
      console.error(err);
      setResult({ error: err?.message || String(err) });
      toast({ title: 'Failed', description: err?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin · Manually Register User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(['email', 'first_name', 'last_name', 'phone', 'city', 'country', 'referrer_user_id'] as const).map(
            (k) => (
              <div key={k} className="space-y-1">
                <Label htmlFor={k} className="capitalize">{k.replace(/_/g, ' ')}</Label>
                <Input id={k} value={(form as any)[k]} onChange={(e) => update(k, e.target.value)} />
              </div>
            )
          )}

          <Button onClick={submit} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create User & Link to Tribe
          </Button>

          {result && (
            <div className="rounded-md border bg-muted p-4 space-y-2">
              <pre className="text-xs whitespace-pre-wrap break-all">
                {JSON.stringify(result, null, 2)}
              </pre>
              {result?.temp_password && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copy(result.temp_password)}
                  className="w-full"
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy Temp Password
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
