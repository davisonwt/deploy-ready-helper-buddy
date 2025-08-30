import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import { Sparkles, Copy, Hash, Lightbulb, Target, TrendingUp, Camera, Video } from 'lucide-react';
import { toast } from '../../hooks/use-toast';

export const OrchardMarketingAssistant = ({ orchardData, onContentGenerated }) => {
  const [activeTab, setActiveTab] = useState('hashtags');
  const [generatedContent, setGeneratedContent] = useState({});
  const { generateContentIdeas, generateMarketingTips, isGenerating } = useAIAssistant();

  const tabs = [
    { id: 'hashtags', label: 'Hashtags', icon: Hash },
    { id: 'hooks', label: 'Marketing Hooks', icon: Target },
    { id: 'trends', label: 'Trending Ideas', icon: TrendingUp },
    { id: 'visuals', label: 'Visual Ideas', icon: Camera },
    { id: 'scripts', label: 'Video Scripts', icon: Video }
  ];

  const generateHashtags = async () => {
    try {
      const result = await generateContentIdeas({
        productDescription: orchardData.title + ': ' + orchardData.description,
        targetAudience: 'social media users interested in ' + orchardData.category,
        contentType: 'social media',
        customPrompt: 'Generate 20 relevant hashtags for this orchard, including trending hashtags, niche hashtags, and community hashtags. Format as comma-separated list.'
      });
      
      setGeneratedContent(prev => ({ ...prev, hashtags: result.ideas }));
      onContentGenerated?.({ type: 'hashtags', content: result.ideas });
    } catch (error) {
      console.error('Failed to generate hashtags:', error);
    }
  };

  const generateMarketingHooks = async () => {
    try {
      const result = await generateMarketingTips({
        productDescription: orchardData.title + ': ' + orchardData.description,
        targetAudience: 'potential supporters and investors',
        platform: 'social media',
        customPrompt: 'Generate 5 compelling marketing hooks and attention-grabbing opening lines for social media posts about this orchard. Focus on emotional impact and urgency.'
      });
      
      setGeneratedContent(prev => ({ ...prev, hooks: result.tips }));
      onContentGenerated?.({ type: 'hooks', content: result.tips });
    } catch (error) {
      console.error('Failed to generate marketing hooks:', error);
    }
  };

  const generateTrendingIdeas = async () => {
    try {
      const result = await generateContentIdeas({
        productDescription: orchardData.title + ': ' + orchardData.description,
        targetAudience: 'trend-conscious social media users',
        contentType: 'viral content',
        customPrompt: 'Generate trending content ideas that could make this orchard go viral. Include current social media trends, challenges, and viral formats.'
      });
      
      setGeneratedContent(prev => ({ ...prev, trends: result.ideas }));
      onContentGenerated?.({ type: 'trends', content: result.ideas });
    } catch (error) {
      console.error('Failed to generate trending ideas:', error);
    }
  };

  const generateVisualIdeas = async () => {
    try {
      const result = await generateContentIdeas({
        productDescription: orchardData.title + ': ' + orchardData.description,
        targetAudience: 'visual content consumers',
        contentType: 'visual content',
        customPrompt: 'Generate detailed prompts for AI image generation, photography ideas, and visual content concepts for this orchard. Include specific lighting, composition, and style suggestions.'
      });
      
      setGeneratedContent(prev => ({ ...prev, visuals: result.ideas }));
      onContentGenerated?.({ type: 'visuals', content: result.ideas });
    } catch (error) {
      console.error('Failed to generate visual ideas:', error);
    }
  };

  const generateVideoScripts = async () => {
    try {
      const result = await generateContentIdeas({
        productDescription: orchardData.title + ': ' + orchardData.description,
        targetAudience: 'video content viewers',
        contentType: 'video content',
        customPrompt: 'Generate 3 different video script outlines: 1) 60-second explainer video, 2) 30-second social media promo, 3) 15-second viral hook. Include timing, key messages, and call-to-actions.'
      });
      
      setGeneratedContent(prev => ({ ...prev, scripts: result.ideas }));
      onContentGenerated?.({ type: 'scripts', content: result.ideas });
    } catch (error) {
      console.error('Failed to generate video scripts:', error);
    }
  };

  const generators = {
    hashtags: generateHashtags,
    hooks: generateMarketingHooks,
    trends: generateTrendingIdeas,
    visuals: generateVisualIdeas,
    scripts: generateVideoScripts
  };

  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard!",
        description: "Content has been copied for your use.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the content manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Marketing Assistant
        </CardTitle>
        <p className="text-sm text-gray-600">
          AI-powered tools to help you create professional marketing content for your orchard
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="min-h-32">
            {generatedContent[activeTab] ? (
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">Generated {tabs.find(t => t.id === activeTab)?.label}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedContent[activeTab])}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {generatedContent[activeTab]}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={generators[activeTab]}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate New {tabs.find(t => t.id === activeTab)?.label}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-3">
                  {tabs.find(t => t.id === activeTab)?.icon && 
                    React.createElement(tabs.find(t => t.id === activeTab).icon, { className: "w-12 h-12 mx-auto" })
                  }
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Generate AI-powered {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} for your orchard
                </p>
                <Button
                  onClick={generators[activeTab]}
                  disabled={isGenerating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate {tabs.find(t => t.id === activeTab)?.label}
                </Button>
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <div className="bg-white p-3 rounded-lg border">
            <h5 className="font-medium text-xs text-gray-700 mb-2 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              Pro Marketing Tips
            </h5>
            <div className="space-y-1 text-xs text-gray-600">
              <p>• Use the generated hashtags across all your social media posts</p>
              <p>• Test different marketing hooks to see what resonates with your audience</p>
              <p>• Create content regularly to keep your orchard visible</p>
              <p>• Enable commission marketing to let others promote your orchard</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};