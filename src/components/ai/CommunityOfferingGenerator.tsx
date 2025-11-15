import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface OfferingPack {
  community_description: string;
  invitation_to_bestow: string[];
  community_hashtags: string[];
  acknowledgment_templates: string[];
  story_prompts: string[];
  orchard_vision: string;
}

interface Props {
  onUseGeneration?: (data: OfferingPack) => void;
}

export function CommunityOfferingGenerator({ onUseGeneration }: Props) {
  const [formData, setFormData] = useState({
    memberName: '',
    offering: '',
    personalStory: '',
    myGoal: '',
    communityBenefit: '',
    tone: 'heartfelt'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<OfferingPack | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerate = async () => {
    // Validate required fields
    if (!formData.memberName || !formData.offering || !formData.personalStory) {
      toast.error('Please fill in at least your name, offering, and story');
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('Calling generate-community-offering function...');
      
      const { data, error } = await supabase.functions.invoke('generate-community-offering', {
        body: formData
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.offering_pack) {
        setGeneratedContent(data.offering_pack);
        toast.success('Community offering generated successfully!');
      } else {
        throw new Error('No content generated');
      }
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast.error(error.message || 'Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleUseContent = () => {
    if (generatedContent && onUseGeneration) {
      onUseGeneration(generatedContent);
      toast.success('Content applied to your orchard!');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Community Offering Generator
          </CardTitle>
          <CardDescription>
            Let AI help you craft an authentic, community-focused offering that inspires genuine bestowing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="memberName">Your Name *</Label>
            <Input
              id="memberName"
              placeholder="Enter your name"
              value={formData.memberName}
              onChange={(e) => setFormData({ ...formData, memberName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offering">What I'm Offering *</Label>
            <Input
              id="offering"
              placeholder="e.g., Handcrafted pottery bowls, Web design services, Community garden produce"
              value={formData.offering}
              onChange={(e) => setFormData({ ...formData, offering: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personalStory">The Story Behind This *</Label>
            <Textarea
              id="personalStory"
              placeholder="Share why this matters to you, how you started, what inspired you..."
              className="min-h-[100px]"
              value={formData.personalStory}
              onChange={(e) => setFormData({ ...formData, personalStory: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="myGoal">What This Helps Me Achieve</Label>
            <Textarea
              id="myGoal"
              placeholder="My dream, goal, or what this enables me to do next..."
              className="min-h-[80px]"
              value={formData.myGoal}
              onChange={(e) => setFormData({ ...formData, myGoal: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="communityBenefit">How This Benefits Our Community</Label>
            <Textarea
              id="communityBenefit"
              placeholder="How does this help others or strengthen our community bonds..."
              className="min-h-[80px]"
              value={formData.communityBenefit}
              onChange={(e) => setFormData({ ...formData, communityBenefit: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Desired Tone</Label>
            <Select value={formData.tone} onValueChange={(value) => setFormData({ ...formData, tone: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heartfelt">Heartfelt</SelectItem>
                <SelectItem value="practical">Practical</SelectItem>
                <SelectItem value="inspiring">Inspiring</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Community Offering
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedContent && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-primary">Generated Community Offering Pack</CardTitle>
            <CardDescription>
              Review and customize the content below. Click the copy buttons to use individual sections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Community Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Community Description</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedContent.community_description, 'description')}
                >
                  {copiedField === 'description' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Textarea
                value={generatedContent.community_description}
                onChange={(e) => setGeneratedContent({ ...generatedContent, community_description: e.target.value })}
                className="min-h-[150px]"
              />
            </div>

            {/* Invitation to Bestow */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Invitation to Bestow (3 options)</Label>
              {generatedContent.invitation_to_bestow?.map((invitation, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Option {idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(invitation, `invitation-${idx}`)}
                    >
                      {copiedField === `invitation-${idx}` ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={invitation}
                    onChange={(e) => {
                      const updated = [...generatedContent.invitation_to_bestow];
                      updated[idx] = e.target.value;
                      setGeneratedContent({ ...generatedContent, invitation_to_bestow: updated });
                    }}
                    className="min-h-[60px]"
                  />
                </div>
              ))}
            </div>

            {/* Community Hashtags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Community Hashtags</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedContent.community_hashtags?.join(' ') || '', 'hashtags')}
                >
                  {copiedField === 'hashtags' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                {generatedContent.community_hashtags?.map((tag, idx) => (
                  <span key={idx} className="text-sm text-primary font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Acknowledgment Templates */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Thank You Templates</Label>
              {generatedContent.acknowledgment_templates?.map((template, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Template {idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(template, `ack-${idx}`)}
                    >
                      {copiedField === `ack-${idx}` ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={template}
                    onChange={(e) => {
                      const updated = [...generatedContent.acknowledgment_templates];
                      updated[idx] = e.target.value;
                      setGeneratedContent({ ...generatedContent, acknowledgment_templates: updated });
                    }}
                    className="min-h-[60px]"
                  />
                </div>
              ))}
            </div>

            {/* Story Prompts */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Story Prompts for Deeper Connection</Label>
              <ul className="list-disc list-inside space-y-1 p-3 bg-muted rounded-md">
                {generatedContent.story_prompts?.map((prompt, idx) => (
                  <li key={idx} className="text-sm">{prompt}</li>
                ))}
              </ul>
            </div>

            {/* Orchard Vision */}
            {generatedContent.orchard_vision && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Orchard Vision</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedContent.orchard_vision, 'vision')}
                  >
                    {copiedField === 'vision' ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Textarea
                  value={generatedContent.orchard_vision}
                  onChange={(e) => setGeneratedContent({ ...generatedContent, orchard_vision: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>
            )}

            {onUseGeneration && (
              <Button 
                onClick={handleUseContent}
                className="w-full"
                size="lg"
              >
                Apply to Orchard
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
