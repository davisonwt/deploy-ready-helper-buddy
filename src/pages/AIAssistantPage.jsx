import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowRight, 
  ArrowLeft, 
  Lightbulb, 
  Camera, 
  Video, 
  GraduationCap, 
  Megaphone,
  Sparkles,
  CheckCircle,
  ExternalLink,
  Wand2,
  Zap
} from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function AIAssistantPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [contentType, setContentType] = useState('');
  const [projectData, setProjectData] = useState({
    title: '',
    description: '',
    targetAudience: '',
    goals: '',
    platform: 'sow2grow',
    sow2growLink: true
  });
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  
  const { usage, limit, getCurrentUsage, generateThumbnail, generateScript, generateContentIdeas } = useAIAssistant();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      getCurrentUsage();
    }
  }, [isAuthenticated, getCurrentUsage]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Sow2Grow Marketing Creator</h1>
          <p className="text-muted-foreground">Please log in to create engaging content that grows our community.</p>
          <Button asChild>
            <a href="/login">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  const contentTypes = [
    {
      id: 'video-ad',
      title: 'Video Advertisement',
      description: 'Create compelling video ads to promote your seeds',
      icon: Video,
      color: 'bg-blue-500'
    },
    {
      id: 'thumbnail',
      title: 'Eye-catching Thumbnail',
      description: 'Design thumbnails that attract sowers to your content',
      icon: Camera,
      color: 'bg-purple-500'
    },
    {
      id: 'course',
      title: 'Course/Workshop (Orchard)',
      description: 'Create educational content that becomes an orchard for attendees',
      icon: GraduationCap,
      color: 'bg-green-500'
    },
    {
      id: 'social-ad',
      title: 'Social Media Ad',
      description: 'Craft social media content that drives traffic to sow2grow',
      icon: Megaphone,
      color: 'bg-orange-500'
    }
  ];

  const usagePercentage = (usage / limit) * 100;

  const handleAIAssist = async () => {
    if (!projectData.description.trim()) {
      toast.error('Please add a description first');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateContentIdeas({
        productDescription: projectData.description,
        targetAudience: projectData.targetAudience || 'Sow2Grow community members',
        contentType: contentType,
        customPrompt: `Please improve and enhance this idea to make it more compelling and effective: "${projectData.description}". Focus on how this connects people back to the Sow2Grow platform for bestowing into orchards.`
      });
      setAiSuggestion(result.ideas);
      toast.success('AI suggestions generated!');
    } catch (error) {
      toast.error('Failed to generate AI suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let result;
      const finalDescription = aiSuggestion || projectData.description;
      
      switch (contentType) {
        case 'thumbnail':
          result = await generateThumbnail({
            productDescription: finalDescription,
            style: 'professional',
            customPrompt: `Include subtle Sow2Grow branding. Make it eye-catching for: ${projectData.title}`
          });
          break;
        case 'video-ad':
        case 'social-ad':
          result = await generateScript({
            productDescription: finalDescription,
            targetAudience: projectData.targetAudience,
            videoLength: 60,
            style: 'engaging',
            customPrompt: `End with a call-to-action directing people to visit sow2grow platform to support this seed or become a sower themselves.`
          });
          break;
        case 'course':
          result = await generateContentIdeas({
            productDescription: finalDescription,
            targetAudience: projectData.targetAudience,
            contentType: 'course-outline',
            customPrompt: `Create a course outline that can be turned into a Sow2Grow orchard where people can reserve spots to attend. Include pricing suggestions and community-building elements.`
          });
          break;
        default:
          result = await generateContentIdeas({
            productDescription: finalDescription,
            targetAudience: projectData.targetAudience,
            contentType: contentType
          });
      }
      
      setGeneratedContent(result);
      setCurrentStep(4);
      toast.success('Content generated successfully!');
    } catch (error) {
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setContentType('');
    setProjectData({
      title: '',
      description: '',
      targetAudience: '',
      goals: '',
      platform: 'sow2grow',
      sow2growLink: true
    });
    setAiSuggestion('');
    setGeneratedContent(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center space-y-4 mb-8">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Sow2Grow Marketing Creator</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Create engaging marketing content that grows our community. Every piece you create will help drive people back to sow2grow to bestow into orchards and become sowers themselves.
        </p>
        
        {/* Usage indicator */}
        <Card className="w-80 mx-auto">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Daily Usage</span>
                <span>{usage}/{limit}</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {limit - usage} generations remaining today
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
              </div>
              {step < 4 && (
                <div className={`w-12 h-1 mx-2 ${
                  currentStep > step ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Choose content type */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              What would you like to create?
            </CardTitle>
            <CardDescription>
              Choose the type of marketing content that will help grow the sow2grow community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {contentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.id}
                    variant={contentType === type.id ? "default" : "outline"}
                    className={`h-24 flex-col gap-3 text-left ${
                      contentType === type.id ? '' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setContentType(type.id)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${type.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">{type.title}</p>
                      <p className="text-xs opacity-70">{type.description}</p>
                    </div>
                  </Button>
                );
              })}
            </div>
            
            {contentType && (
              <div className="mt-6 text-center">
                <Button onClick={() => setCurrentStep(2)}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Project details */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Tell us about your project
            </CardTitle>
            <CardDescription>
              Share the details so we can create compelling content that connects people to sow2grow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                value={projectData.title}
                onChange={(e) => setProjectData({...projectData, title: e.target.value})}
                placeholder="What's your project called?"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={projectData.description}
                onChange={(e) => setProjectData({...projectData, description: e.target.value})}
                placeholder="Describe your project, what it does, and why people should care..."
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                value={projectData.targetAudience}
                onChange={(e) => setProjectData({...projectData, targetAudience: e.target.value})}
                placeholder="Who is this for? (e.g., entrepreneurs, students, creators)"
              />
            </div>
            
            <div>
              <Label htmlFor="goals">Goals & Impact</Label>
              <Textarea
                id="goals"
                value={projectData.goals}
                onChange={(e) => setProjectData({...projectData, goals: e.target.value})}
                placeholder="What impact will this create? How does it help the community?"
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)}
                disabled={!projectData.title || !projectData.description}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: AI Enhancement */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              AI-Enhanced Content Creation
            </CardTitle>
            <CardDescription>
              Let AI help improve your idea and create compelling content that drives engagement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Your Project Summary:</h4>
              <p className="text-sm text-muted-foreground mb-1">
                <strong>Title:</strong> {projectData.title}
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                <strong>Type:</strong> {contentTypes.find(t => t.id === contentType)?.title}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Description:</strong> {projectData.description}
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>AI Enhancement (Optional but Recommended)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAIAssist}
                  disabled={isGenerating}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Enhancing...' : 'Get AI Suggestions'}
                </Button>
              </div>
              
              {aiSuggestion && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <h5 className="font-medium text-green-800 mb-2">AI-Enhanced Version:</h5>
                  <p className="text-sm text-green-700">{aiSuggestion}</p>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h5 className="font-medium text-blue-800 mb-2">🌱 Sow2Grow Integration</h5>
              <p className="text-sm text-blue-700">
                Your content will automatically include calls-to-action that direct people to visit sow2grow.com 
                to support your {contentType === 'course' ? 'orchard (course)' : 'seed'} or explore other opportunities to become sowers themselves.
              </p>
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate Content'}
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Generated content & sow2grow integration */}
      {currentStep === 4 && generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Your Content is Ready!
            </CardTitle>
            <CardDescription>
              Here's your AI-generated content with built-in sow2grow community growth features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-6 rounded-lg">
              <h4 className="font-semibold mb-4">{contentTypes.find(t => t.id === contentType)?.title}</h4>
              <div className="prose prose-sm max-w-none">
                {contentType === 'thumbnail' && generatedContent.image_url && (
                  <img src={generatedContent.image_url} alt="Generated thumbnail" className="rounded-lg mb-4" />
                )}
                <div className="whitespace-pre-wrap">
                  {generatedContent.script || generatedContent.ideas || generatedContent.tips || 'Content generated successfully!'}
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <h5 className="font-medium text-green-800 mb-2">🌱 Sow2Grow Links</h5>
                  <p className="text-sm text-green-700 mb-3">
                    Your content includes strategic calls-to-action that will drive people to:
                  </p>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Visit your {contentType === 'course' ? 'orchard page' : 'seed on sow2grow'}</li>
                    <li>• Explore other seeds to bestow into</li>
                    <li>• Join as sowers themselves</li>
                    <li>• Discover the 364yhvh community</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <h5 className="font-medium text-blue-800 mb-2">📊 Next Steps</h5>
                  <div className="space-y-2">
                    <Button size="sm" className="w-full" asChild>
                      <a href="/create-orchard" target="_blank">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        {contentType === 'course' ? 'Create Your Orchard' : 'Create Your Seed'}
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" className="w-full" asChild>
                      <a href="/browse-orchards" target="_blank">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Share in Community
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-between items-center pt-4">
              <Button variant="outline" onClick={resetWizard}>
                Create Another
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(generatedContent.script || generatedContent.ideas || generatedContent.tips || '');
                  toast.success('Content copied to clipboard!');
                }}>
                  Copy Content
                </Button>
                <Button asChild>
                  <a href="/browse-orchards" target="_blank">
                    Go to Sow2Grow
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}