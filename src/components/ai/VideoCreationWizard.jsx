import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Lightbulb, 
  Target, 
  Users, 
  MessageSquare, 
  Video, 
  Edit3,
  Share2,
  BarChart3,
  Camera,
  Mic,
  Palette,
  Play,
  Download,
  Sparkles,
  Copy,
  FileText,
  Eye,
  Heart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const VideoCreationWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [wizardData, setWizardData] = useState({
    // Step 1: Goal & Audience
    goal: '',
    specificGoal: '',
    targetAudience: '',
    audienceAge: '',
    audiencePainPoints: '',
    
    // Step 2: Message & Idea
    coreMessage: '',
    videoIdea: '',
    videoType: '',
    emotionalHook: '',
    
    // Step 3: Platform & Format
    primaryPlatform: '',
    videoFormat: '',
    duration: '',
    style: '',
    
    // Step 4: Script
    hook: '',
    problem: '',
    solution: '',
    proof: '',
    cta: '',
    
    // Step 5: Production Plan
    budget: '',
    equipment: [],
    location: '',
    talent: '',
    
    // Generated Content
    generatedScript: '',
    generatedStoryboard: '',
    generatedHashtags: '',
    generatedTitle: '',
    generatedDescription: ''
  });
  const [generating, setGenerating] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const steps = [
    {
      number: 1,
      title: "Goal & Audience",
      description: "Define what you want to achieve and who you're talking to",
      icon: Target,
      phase: "Pre-Production"
    },
    {
      number: 2,
      title: "Message & Idea",
      description: "Craft your core message and creative concept",
      icon: Lightbulb,
      phase: "Pre-Production"
    },
    {
      number: 3,
      title: "Platform & Format",
      description: "Choose where and how to share your video",
      icon: Share2,
      phase: "Pre-Production"
    },
    {
      number: 4,
      title: "Script Writing",
      description: "Create your video script with AI assistance",
      icon: FileText,
      phase: "Pre-Production"
    },
    {
      number: 5,
      title: "Production Plan",
      description: "Plan your filming setup and requirements",
      icon: Camera,
      phase: "Production"
    },
    {
      number: 6,
      title: "AI Generation",
      description: "Generate complete marketing materials",
      icon: Sparkles,
      phase: "AI Enhancement"
    },
    {
      number: 7,
      title: "Review & Export",
      description: "Review all materials and export for production",
      icon: Download,
      phase: "Finalization"
    }
  ];

  const updateWizardData = (field, value) => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };

  const markStepComplete = (stepNumber) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps(prev => [...prev, stepNumber]);
    }
  };

  const generateAIContent = async () => {
    setGenerating(true);
    try {
      // Generate comprehensive marketing content
      const contentPrompt = `Create comprehensive marketing content for a Sow2Grow marketplace video:

      PRODUCT/SERVICE: ${wizardData.specificGoal}
      TARGET AUDIENCE: ${wizardData.targetAudience} (${wizardData.audienceAge})
      PAIN POINTS: ${wizardData.audiencePainPoints}
      CORE MESSAGE: ${wizardData.coreMessage}
      VIDEO TYPE: ${wizardData.videoType}
      PLATFORM: ${wizardData.primaryPlatform}
      DURATION: ${wizardData.duration} seconds
      
      Generate:
      1. Complete video script (${wizardData.duration}s) with timing markers
      2. Scene-by-scene storyboard descriptions
      3. Platform-optimized title (under 60 characters)
      4. Engaging description (under 200 words)
      5. Sow2Grow-specific hashtags to attract bestowers
      6. Production tips for filming
      
      Focus on attracting bestowers (buyers) to this sower's orchard on the Sow2Grow marketplace.`;

      const { data, error } = await supabase.functions.invoke('generate-content-ideas', {
        body: {
          productDescription: wizardData.specificGoal,
          targetAudience: wizardData.targetAudience,
          contentType: 'complete-video-package',
          customPrompt: contentPrompt
        }
      });

      if (error) throw error;

      // Parse and update wizard data
      updateWizardData('generatedScript', data.ideas);
      updateWizardData('generatedStoryboard', data.ideas);
      updateWizardData('generatedHashtags', '#Sow2Grow #BestowersWanted #OrchardLife #SowingSuccess #GrowTogether #MarketplaceMagic');
      updateWizardData('generatedTitle', `Amazing ${wizardData.videoType} for ${wizardData.targetAudience}`);
      updateWizardData('generatedDescription', `Discover why bestowers love this orchard! ${wizardData.coreMessage}`);

      markStepComplete(6);
      toast({
        title: "AI content generated!",
        description: "Your complete video marketing package is ready"
      });

    } catch (error) {
      console.error('AI generation failed:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate content",
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

  const nextStep = () => {
    markStepComplete(currentStep);
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5" />
                Define Your Goal & Audience
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>What's your main goal? *</Label>
                  <Select value={wizardData.goal} onValueChange={(value) => updateWizardData('goal', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your primary goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand-awareness">Increase brand awareness</SelectItem>
                      <SelectItem value="generate-leads">Generate leads & bestowers</SelectItem>
                      <SelectItem value="product-feature">Explain a product feature</SelectItem>
                      <SelectItem value="drive-sales">Drive sales for specific item</SelectItem>
                      <SelectItem value="build-trust">Build trust & credibility</SelectItem>
                      <SelectItem value="community">Build community on Sow2Grow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Specific Goal Description *</Label>
                  <Textarea
                    value={wizardData.specificGoal}
                    onChange={(e) => updateWizardData('specificGoal', e.target.value)}
                    placeholder="Be specific: What exactly are you selling/promoting in your orchard? (e.g., Organic tomatoes, handmade crafts, farm-to-table experiences)"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Audience *</Label>
                  <Input
                    value={wizardData.targetAudience}
                    onChange={(e) => updateWizardData('targetAudience', e.target.value)}
                    placeholder="Who are your ideal bestowers? (e.g., Health-conscious families, Local food enthusiasts)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audience Age & Demographics</Label>
                  <Input
                    value={wizardData.audienceAge}
                    onChange={(e) => updateWizardData('audienceAge', e.target.value)}
                    placeholder="e.g., 25-45 years old, suburban families, eco-conscious consumers"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audience Pain Points *</Label>
                  <Textarea
                    value={wizardData.audiencePainPoints}
                    onChange={(e) => updateWizardData('audiencePainPoints', e.target.value)}
                    placeholder="What problems do your bestowers face? (e.g., Hard to find fresh organic produce, expensive grocery store prices)"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">🎯 Pro Tip: Know Your Bestowers</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      The more specific you are about your target bestowers, the more effective your video will be. Think about:
                      their shopping habits, values, and what motivates them to support local sowers on Sow2Grow.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Craft Your Message & Creative Idea
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Core Message *</Label>
                  <Input
                    value={wizardData.coreMessage}
                    onChange={(e) => updateWizardData('coreMessage', e.target.value)}
                    placeholder="One sentence that captures your main benefit (e.g., 'Fresh organic tomatoes delivered to your door within 24 hours')"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Video Type & Style *</Label>
                  <Select value={wizardData.videoType} onValueChange={(value) => updateWizardData('videoType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your video style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product-showcase">Product Showcase</SelectItem>
                      <SelectItem value="customer-testimonial">Customer Testimonial</SelectItem>
                      <SelectItem value="behind-scenes">Behind the Scenes</SelectItem>
                      <SelectItem value="how-to-tutorial">How-To/Tutorial</SelectItem>
                      <SelectItem value="story-driven">Story-Driven</SelectItem>
                      <SelectItem value="before-after">Before/After Comparison</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle Integration</SelectItem>
                      <SelectItem value="animated-explainer">Animated Explainer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Creative Idea Concept</Label>
                  <Textarea
                    value={wizardData.videoIdea}
                    onChange={(e) => updateWizardData('videoIdea', e.target.value)}
                    placeholder="Describe your creative concept. How will you make this engaging and memorable? (e.g., Show a family's excitement when they receive their fresh produce box)"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Emotional Hook *</Label>
                  <Textarea
                    value={wizardData.emotionalHook}
                    onChange={(e) => updateWizardData('emotionalHook', e.target.value)}
                    placeholder="What emotion will grab attention in the first 3 seconds? (e.g., Frustration with wilted store produce, joy of biting into fresh fruit)"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">💡 Creative Inspiration</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Great videos combine emotion with simplicity. Think about what makes your orchard special and 
                      how it makes bestowers feel. Authenticity beats perfection every time!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Choose Platform & Format
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Primary Platform *</Label>
                  <Select value={wizardData.primaryPlatform} onValueChange={(value) => updateWizardData('primaryPlatform', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Where will you share this video?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sow2grow">Sow2Grow Marketplace</SelectItem>
                      <SelectItem value="instagram">Instagram (Reels/Stories)</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube (Shorts/Regular)</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="website">Website Landing Page</SelectItem>
                      <SelectItem value="email">Email Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Video Duration *</Label>
                  <Select value={wizardData.duration} onValueChange={(value) => updateWizardData('duration', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="How long should your video be?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 seconds (TikTok/Instagram Reels)</SelectItem>
                      <SelectItem value="30">30 seconds (Instagram/Facebook)</SelectItem>
                      <SelectItem value="60">60 seconds (YouTube Shorts)</SelectItem>
                      <SelectItem value="90">90 seconds (Detailed explanation)</SelectItem>
                      <SelectItem value="120">2 minutes (In-depth content)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Video Format</Label>
                  <Select value={wizardData.videoFormat} onValueChange={(value) => updateWizardData('videoFormat', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose format based on platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vertical">Vertical (9:16) - Mobile First</SelectItem>
                      <SelectItem value="square">Square (1:1) - Social Media</SelectItem>
                      <SelectItem value="horizontal">Horizontal (16:9) - YouTube/Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Content Style</Label>
                  <Select value={wizardData.style} onValueChange={(value) => updateWizardData('style', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="What style fits your brand?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional & Polished</SelectItem>
                      <SelectItem value="casual">Casual & Authentic</SelectItem>
                      <SelectItem value="trendy">Trendy & Modern</SelectItem>
                      <SelectItem value="educational">Educational & Informative</SelectItem>
                      <SelectItem value="emotional">Emotional & Heartwarming</SelectItem>
                      <SelectItem value="fun">Fun & Energetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Share2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">📱 Platform Optimization</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Each platform has different best practices. Sow2Grow focuses on community and trust, 
                      while social media prioritizes quick engagement. Choose the format that matches your goal.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Script Writing Framework
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Hook (0-3 seconds) *</Label>
                  <Input
                    value={wizardData.hook}
                    onChange={(e) => updateWizardData('hook', e.target.value)}
                    placeholder="Grab attention immediately (e.g., 'Tired of tasteless supermarket tomatoes?')"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Problem Statement</Label>
                  <Textarea
                    value={wizardData.problem}
                    onChange={(e) => updateWizardData('problem', e.target.value)}
                    placeholder="Describe the pain point your audience faces..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Solution (Your Product/Service)</Label>
                  <Textarea
                    value={wizardData.solution}
                    onChange={(e) => updateWizardData('solution', e.target.value)}
                    placeholder="How does your orchard solve this problem?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Proof/Value Demonstration</Label>
                  <Textarea
                    value={wizardData.proof}
                    onChange={(e) => updateWizardData('proof', e.target.value)}
                    placeholder="Show evidence (testimonial, before/after, key benefit)..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Call to Action (CTA) *</Label>
                  <Input
                    value={wizardData.cta}
                    onChange={(e) => updateWizardData('cta', e.target.value)}
                    placeholder="Tell viewers exactly what to do (e.g., 'Visit our Sow2Grow orchard today!')"
                  />
                </div>
              </div>
            </div>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-purple-900">✍️ Script Structure</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      Keep it conversational and concise. For a 30-second video, aim for about 75 words. 
                      Remember: people scan before they listen, so your visuals should tell the story too.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Production Planning
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Budget Range</Label>
                  <Select value={wizardData.budget} onValueChange={(value) => updateWizardData('budget', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="What's your budget?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diy">DIY ($0-50) - Smartphone & creativity</SelectItem>
                      <SelectItem value="low">Low ($50-200) - Basic equipment</SelectItem>
                      <SelectItem value="medium">Medium ($200-500) - Semi-professional</SelectItem>
                      <SelectItem value="high">High ($500+) - Professional setup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Available Equipment</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Smartphone camera',
                      'DSLR/Mirrorless camera',
                      'External microphone',
                      'Tripod',
                      'Lighting kit',
                      'Editing software'
                    ].map((item) => (
                      <label key={item} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={wizardData.equipment.includes(item)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateWizardData('equipment', [...wizardData.equipment, item]);
                            } else {
                              updateWizardData('equipment', wizardData.equipment.filter(eq => eq !== item));
                            }
                          }}
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Filming Location</Label>
                  <Input
                    value={wizardData.location}
                    onChange={(e) => updateWizardData('location', e.target.value)}
                    placeholder="Where will you film? (e.g., Your farm, kitchen, garden)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Who will be on camera?</Label>
                  <Input
                    value={wizardData.talent}
                    onChange={(e) => updateWizardData('talent', e.target.value)}
                    placeholder="You, family members, customers, or hired actors?"
                  />
                </div>
              </div>
            </div>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Camera className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">🎥 Production Essentials</h4>
                    <ul className="text-sm text-red-700 mt-1 space-y-1">
                      <li>• Good audio is more important than perfect video</li>
                      <li>• Natural lighting is free and beautiful</li>
                      <li>• Stable footage = professional look (use a tripod!)</li>
                      <li>• Film extra B-roll footage for editing flexibility</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Content Generation
              </h3>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Button
                    onClick={generateAIContent}
                    disabled={generating || !wizardData.specificGoal || !wizardData.coreMessage}
                    size="lg"
                    className="w-full"
                  >
                    {generating ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Generating Complete Video Package...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Complete Video Marketing Package
                      </>
                    )}
                  </Button>
                  
                  <p className="text-sm text-gray-600 mt-3">
                    AI will create: Complete script, storyboard, hashtags, title, description, and production tips
                  </p>
                </CardContent>
              </Card>

              {wizardData.generatedScript && (
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Complete Video Script</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(wizardData.generatedScript, 'Video script')}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                          {wizardData.generatedScript}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Sow2Grow Hashtags</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(wizardData.generatedHashtags, 'Hashtags')}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600">{wizardData.generatedHashtags}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Download className="w-5 h-5" />
                Review & Export Your Marketing Package
              </h3>
              
              <div className="grid gap-4">
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-800">🎉 Your Video Marketing Package is Ready!</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Video Details</h4>
                        <ul className="text-sm space-y-1">
                          <li><strong>Goal:</strong> {wizardData.goal}</li>
                          <li><strong>Duration:</strong> {wizardData.duration} seconds</li>
                          <li><strong>Platform:</strong> {wizardData.primaryPlatform}</li>
                          <li><strong>Style:</strong> {wizardData.videoType}</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Target Audience</h4>
                        <ul className="text-sm space-y-1">
                          <li><strong>Who:</strong> {wizardData.targetAudience}</li>
                          <li><strong>Age:</strong> {wizardData.audienceAge}</li>
                          <li><strong>Pain Points:</strong> {wizardData.audiencePainPoints}</li>
                        </ul>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <h4 className="font-medium">Next Steps:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Button variant="outline" className="text-left">
                          <Camera className="w-4 h-4 mr-2" />
                          Start Filming
                        </Button>
                        <Button variant="outline" className="text-left">
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Video
                        </Button>
                        <Button variant="outline" className="text-left">
                          <Share2 className="w-4 h-4 mr-2" />
                          Publish & Promote
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>📊 Success Metrics to Track</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <Eye className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                        <div className="text-sm font-medium">Views</div>
                        <div className="text-xs text-gray-500">Reach & Awareness</div>
                      </div>
                      <div className="text-center">
                        <Heart className="w-6 h-6 mx-auto mb-2 text-red-500" />
                        <div className="text-sm font-medium">Engagement</div>
                        <div className="text-xs text-gray-500">Likes & Comments</div>
                      </div>
                      <div className="text-center">
                        <Share2 className="w-6 h-6 mx-auto mb-2 text-green-500" />
                        <div className="text-sm font-medium">Shares</div>
                        <div className="text-xs text-gray-500">Viral Potential</div>
                      </div>
                      <div className="text-center">
                        <Target className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                        <div className="text-sm font-medium">Conversions</div>
                        <div className="text-xs text-gray-500">Orchard Visits</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6" />
            AI Video Creation Wizard
          </h2>
          <Badge variant="outline">{completedSteps.length}/{steps.length} Complete</Badge>
        </div>
        
        <Progress value={(completedSteps.length / steps.length) * 100} className="h-2" />
        
        {/* Step Navigation */}
        <div className="flex flex-wrap gap-2">
          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.includes(step.number);
            const isCurrent = currentStep === step.number;
            
            return (
              <Button
                key={step.number}
                variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
                size="sm"
                onClick={() => setCurrentStep(step.number)}
                className="flex items-center gap-2"
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
                <span className="sm:hidden">{step.number}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Step {currentStep}: {steps[currentStep - 1].title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {steps[currentStep - 1].description}
              </p>
            </div>
            <Badge variant="secondary">{steps[currentStep - 1].phase}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <Button
          onClick={nextStep}
          disabled={currentStep === steps.length}
        >
          {currentStep === steps.length ? 'Complete' : 'Next Step'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};