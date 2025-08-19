import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Wand2, Video, Sparkles, Play, Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const AIVideoGenerator = ({ onVideoGenerated }) => {
  const [productDescription, setProductDescription] = useState('');
  const [videoStyle, setVideoStyle] = useState('');
  const [duration, setDuration] = useState('30');
  const [targetAudience, setTargetAudience] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [generatingHashtags, setGeneratingHashtags] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const videoStyles = [
    { value: 'product-showcase', label: 'Product Showcase' },
    { value: 'testimonial', label: 'Customer Testimonial' },
    { value: 'behind-scenes', label: 'Behind the Scenes' },
    { value: 'how-to', label: 'How-To/Tutorial' },
    { value: 'lifestyle', label: 'Lifestyle Integration' },
    { value: 'comparison', label: 'Before/After Comparison' },
    { value: 'story-driven', label: 'Story-Driven' },
    { value: 'animated', label: 'Animated Explanation' }
  ];

  const generateHashtags = async (description, style, audience) => {
    setGeneratingHashtags(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content-ideas', {
        body: {
          productDescription: description,
          targetAudience: audience,
          contentType: 'hashtags',
          customPrompt: `Generate platform-specific hashtags for this ${style} video. Include:
          1. General hashtags for broad reach
          2. Sow2Grow specific hashtags (#Sow2Grow #BestowersWanted #OrchardLife #SowingSuccess #GrowTogether)
          3. Instagram hashtags (mix of popular and niche)
          4. TikTok trending hashtags
          5. YouTube tags
          6. Twitter hashtags
          Focus on hashtags that will attract bestowers (buyers) to sowers (sellers) on agricultural/marketplace platforms.`
        }
      });

      if (error) throw error;
      return data.ideas;
    } catch (error) {
      console.error('Hashtag generation failed:', error);
      return null;
    } finally {
      setGeneratingHashtags(false);
    }
  };

  const handleGenerate = async () => {
    if (!productDescription.trim() || !videoStyle || !user) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    setProgress(0);

    try {
      // Simulate AI video generation progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 1000);

      // Generate video script and storyboard first
      const scriptPrompt = `Create a detailed ${duration}-second ${videoStyle} video script for: ${productDescription}. 
      Target audience: ${targetAudience || 'general marketplace buyers'}. 
      ${customPrompt ? `Additional requirements: ${customPrompt}` : ''}
      
      The video should attract bestowers (buyers) to this sower's (seller's) orchard on Sow2Grow marketplace.
      Include:
      - Scene-by-scene breakdown
      - Voiceover script
      - Visual descriptions
      - Call-to-action for Sow2Grow platform`;

      const { data: scriptData, error: scriptError } = await supabase.functions.invoke('generate-script', {
        body: {
          productDescription,
          targetAudience: targetAudience || 'Potential buyers and bestowers',
          videoLength: duration,
          style: videoStyle,
          customPrompt: scriptPrompt
        }
      });

      if (scriptError) throw scriptError;

      // Generate hashtags
      const hashtags = await generateHashtags(productDescription, videoStyle, targetAudience);

      clearInterval(progressInterval);
      setProgress(100);

      // Since we can't actually generate video files with current setup,
      // we'll create a comprehensive video plan with script and hashtags
      const videoContent = {
        id: Date.now().toString(),
        title: `AI Generated ${videoStyle.replace('-', ' ')} Video`,
        script: scriptData.script,
        hashtags: hashtags,
        style: videoStyle,
        duration: parseInt(duration),
        productDescription,
        targetAudience,
        status: 'script-ready', // Would be 'generated' if we had actual video
        created_at: new Date().toISOString()
      };

      // Save to database
      const { data: savedVideo, error: saveError } = await supabase
        .from('video_content')
        .insert({
          user_id: user.id,
          video_url: null, // Would contain actual video URL
          title: videoContent.title,
          description: productDescription,
          ai_generated_script: scriptData.script,
          ai_generated_description: hashtags,
          tags: [videoStyle, 'ai-generated'],
          platform_optimizations: {
            sow2grow: {
              hashtags: hashtags?.match(/#Sow2Grow[^\s]*/gi) || [],
              script: scriptData.script
            },
            instagram: {
              hashtags: hashtags?.match(/#[^\s]{3,}/gi)?.slice(0, 30) || []
            },
            tiktok: {
              hashtags: hashtags?.match(/#[^\s]{3,}/gi)?.slice(0, 20) || []
            }
          }
        })
        .select()
        .single();

      if (saveError) throw saveError;

      setGeneratedVideo({ ...videoContent, ...savedVideo });

      toast({
        title: "Video content generated!",
        description: "Your AI video script and hashtags are ready for production"
      });

      if (onVideoGenerated) {
        onVideoGenerated(savedVideo);
      }

    } catch (error) {
      console.error('Generation failed:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate video content",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Video Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Description */}
          <div className="space-y-2">
            <Label htmlFor="product-desc">Product/Service Description *</Label>
            <Textarea
              id="product-desc"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe what you're selling in your orchard. Be specific about benefits, features, and why bestowers should choose you..."
              rows={3}
            />
          </div>

          {/* Video Style */}
          <div className="space-y-2">
            <Label>Video Style *</Label>
            <Select value={videoStyle} onValueChange={setVideoStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Choose video style" />
              </SelectTrigger>
              <SelectContent>
                {videoStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration and Target Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Video Duration (seconds)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 seconds (TikTok/Reels)</SelectItem>
                  <SelectItem value="30">30 seconds (Instagram)</SelectItem>
                  <SelectItem value="60">60 seconds (YouTube Shorts)</SelectItem>
                  <SelectItem value="120">2 minutes (YouTube)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-audience">Target Audience</Label>
              <Input
                id="target-audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Health-conscious consumers, Local farmers, etc."
              />
            </div>
          </div>

          {/* Custom Requirements */}
          <div className="space-y-2">
            <Label htmlFor="custom-prompt">Additional Requirements</Label>
            <Textarea
              id="custom-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Any specific requirements, tone, or messaging you want included..."
              rows={2}
            />
          </div>

          {/* Generation Progress */}
          {generating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Generating video content...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
              {generatingHashtags && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Generating platform-specific hashtags...
                </div>
              )}
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!productDescription.trim() || !videoStyle || generating}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                Generating AI Video Content...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Generate AI Video Script & Hashtags
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Content Display */}
      {generatedVideo && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Sparkles className="w-5 h-5" />
              Generated Video Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Video Script */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Video Script ({duration}s {videoStyle})</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedVideo.script, 'Video script')}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Script
                </Button>
              </div>
              <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                {generatedVideo.script}
              </div>
            </div>

            {/* Platform-Specific Hashtags */}
            {generatedVideo.hashtags && (
              <div className="space-y-3">
                <h4 className="font-medium">Platform-Specific Hashtags</h4>
                
                {/* Sow2Grow Hashtags */}
                <Card className="bg-white border-l-4 border-l-green-500">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-green-700">🌱 Sow2Grow Platform</h5>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const sow2growHashtags = "#Sow2Grow #BestowersWanted #OrchardLife #SowingSuccess #GrowTogether #MarketplaceMagic #SowerPride #HarvestTogether";
                          copyToClipboard(sow2growHashtags, 'Sow2Grow hashtags');
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600">
                      #Sow2Grow #BestowersWanted #OrchardLife #SowingSuccess #GrowTogether #MarketplaceMagic #SowerPride #HarvestTogether
                    </p>
                  </CardContent>
                </Card>

                {/* All Generated Hashtags */}
                <Card className="bg-white">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">📱 All Platform Hashtags</h5>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(generatedVideo.hashtags, 'All hashtags')}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy All
                      </Button>
                    </div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {generatedVideo.hashtags}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export Script
              </Button>
              <Button variant="outline" className="flex-1">
                <Video className="w-4 h-4 mr-2" />
                Create Video
              </Button>
              <Button className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                Start Production
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Features Info */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900 mb-1">AI Video Intelligence</h3>
              <p className="text-sm text-green-700 mb-2">
                Our AI creates comprehensive video marketing packages:
              </p>
              <ul className="text-sm text-green-600 space-y-1">
                <li>• 🎬 Detailed scene-by-scene scripts</li>
                <li>• 🎯 Platform-optimized hashtags (Instagram, TikTok, YouTube, Sow2Grow)</li>
                <li>• 📝 Voiceover and visual direction</li>
                <li>• 🌱 Sow2Grow-specific content to attract bestowers</li>
                <li>• 📈 Marketing strategy recommendations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};