import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUsageLimit } from '@/hooks/useUsageLimit';

const ContentCreationWorkflow = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ 
    prompt: '', 
    text: '', 
    imageUrl: '', 
    videoUrl: '' 
  });
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  const { remaining: textRemaining } = useUsageLimit('script');
  const { remaining: imageRemaining } = useUsageLimit('thumbnail');
  const { remaining: videoRemaining } = useUsageLimit('video');

  const steps = [
    { 
      title: 'Concept', 
      description: 'Define your creative idea',
      remaining: null 
    },
    { 
      title: 'Text Generation', 
      description: 'Generate script or content',
      remaining: textRemaining 
    },
    { 
      title: 'Image Generation', 
      description: 'Create visual assets',
      remaining: imageRemaining 
    },
    { 
      title: 'Video Generation', 
      description: 'Produce final video',
      remaining: videoRemaining 
    },
  ];

  const generateText = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-script', {
        body: { 
          productDescription: data.prompt,
          videoLength: 30,
          style: 'engaging'
        },
      });
      
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      
      setData({ ...data, text: result.script });
      setStep(2);
      toast({ title: 'Script generated successfully!' });
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-thumbnail', {
        body: { 
          productDescription: data.text,
          style: 'professional',
          confirmed: true
        },
      });
      
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      
      setData({ ...data, imageUrl: result.imageUrl });
      setStep(3);
      toast({ title: 'Image generated successfully!' });
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const generateVideo = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-video', {
        body: { prompt: data.text },
      });
      
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      
      setData({ ...data, videoUrl: result.video_url });
      toast({ title: 'Content creation workflow completed!' });
    } catch (err: any) {
      toast({ variant: 'destructive', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 0) setStep(1);
    else if (step === 1) generateText();
    else if (step === 2) generateImage();
    else if (step === 3) generateVideo();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const canProceed = () => {
    if (step === 0) return data.prompt.trim().length > 0;
    if (step === 1) return textRemaining > 0;
    if (step === 2) return imageRemaining > 0;
    if (step === 3) return videoRemaining > 0;
    return false;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Content Creation Workflow</CardTitle>
        <div className="flex gap-2 mt-2">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <Badge 
                variant={i === step ? 'default' : i < step ? 'secondary' : 'outline'}
                className="mb-1"
              >
                {i + 1}
              </Badge>
              <div className="text-center">
                <p className="text-xs font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
                {s.remaining !== null && (
                  <p className="text-xs text-muted-foreground">
                    Remaining: {s.remaining}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Creative Concept
              </label>
              <Textarea
                placeholder="Describe your content idea (e.g., 'A promotional video for organic honey highlighting natural benefits and sustainable beekeeping')"
                value={data.prompt}
                onChange={(e) => setData({ ...data, prompt: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Generated Script
              </label>
              {data.text ? (
                <Textarea value={data.text} readOnly rows={6} />
              ) : (
                <p className="text-muted-foreground">
                  Click "Generate Script" to create content based on your concept.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Generated Image
              </label>
              {data.imageUrl ? (
                <img 
                  src={data.imageUrl} 
                  alt="Generated" 
                  className="w-full h-48 object-cover rounded-lg" 
                />
              ) : (
                <p className="text-muted-foreground">
                  Click "Generate Image" to create visuals for your content.
                </p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Generated Video
              </label>
              {data.videoUrl ? (
                <video 
                  src={data.videoUrl} 
                  controls 
                  className="w-full aspect-video rounded-lg" 
                />
              ) : (
                <p className="text-muted-foreground">
                  Click "Generate Video" to create the final video content.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          <Button 
            onClick={handleNext} 
            className="flex-1" 
            disabled={loading || !canProceed()}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            {step === 0 ? 'Start Generation' : 
             step === 1 ? 'Generate Script' :
             step === 2 ? 'Generate Image' :
             'Generate Video'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentCreationWorkflow;