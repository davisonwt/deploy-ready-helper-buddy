import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUsageLimit } from '@/hooks/useUsageLimit';

const VideoGeneration = () => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const { session } = useAuth();
  const user = session?.user;
  const { remaining, loading: limitLoading } = useUsageLimit('video');
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!user || remaining === 0) {
      setError('No generations remaining or not logged in');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      // Insert pending generation
      const { data: generation, error: insertError } = await supabase
        .from('ai_creations')
        .insert({
          user_id: user.id,
          content_type: 'video',
          title: `Video: ${prompt.substring(0, 40)}...`,
          content_text: prompt,
          metadata: { status: 'pending' }
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Call Edge Function for video generation
      const { data: result, error: funcError } = await supabase.functions.invoke('generate-video', {
        body: { generation_id: generation?.id, prompt },
      });

      if (funcError) throw funcError;
      if (result.error) throw new Error(result.error);

      // Poll for completion (in real implementation, use websockets or webhooks)
      const pollInterval = setInterval(async () => {
        const { data: updated, error: pollError } = await supabase
          .from('ai_creations')
          .select('metadata')
          .eq('id', generation?.id)
          .single();

        if (pollError) {
          clearInterval(pollInterval);
          throw pollError;
        }

        if (updated?.metadata?.status === 'completed' && updated?.metadata?.video_url) {
          setVideoUrl(updated.metadata.video_url);
          clearInterval(pollInterval);
          toast({ title: 'Video generated successfully!' });
          setGenerating(false);
        } else if (updated?.metadata?.status === 'failed') {
          clearInterval(pollInterval);
          throw new Error('Video generation failed');
        }
      }, 5000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (generating) {
          setGenerating(false);
          setError('Generation timeout - please try again');
        }
      }, 300000);

    } catch (err: any) {
      setError(err.message);
      setGenerating(false);
      toast({ 
        variant: 'destructive', 
        title: 'Generation failed', 
        description: err.message 
      });
    }
  };

  if (limitLoading) return <div>Loading limits...</div>;

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Generate Video</CardTitle>
        <p className="text-sm text-muted-foreground">Remaining: {remaining}/10</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Describe the video (e.g., 'A cat dancing in space with colorful lights')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />
        <Button 
          onClick={handleGenerate} 
          className="w-full" 
          disabled={generating || remaining === 0 || !prompt.trim()}
        >
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Video className="mr-2 h-4 w-4" />
          )}
          {generating ? 'Generating Video...' : 'Generate Video'}
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {videoUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Generated Video:</p>
            <video src={videoUrl} controls className="w-full aspect-video rounded-lg">
              Your browser does not support video playback.
            </video>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoGeneration;