import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Copy, Wand2, X } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { toast } from '@/hooks/use-toast';

export const QuickAIHelper = ({ 
  type = 'general', 
  onContentGenerated, 
  placeholder,
  suggestions = [],
  compact = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const { generateScript, generateMarketingTips, generateContentIdeas, isGenerating } = useAIAssistant();

  const getAIFunction = () => {
    switch (type) {
      case 'script':
        return generateScript;
      case 'tips':
        return generateMarketingTips;
      case 'ideas':
        return generateContentIdeas;
      default:
        return generateContentIdeas;
    }
  };

  const getTypeConfig = () => {
    switch (type) {
      case 'orchard-title':
        return {
          title: 'AI Title Generator',
          description: 'Generate compelling orchard titles',
          placeholder: 'Describe your orchard briefly (e.g., "organic tomato garden for community")',
          buttonText: 'Generate Title',
          icon: Wand2
        };
      case 'orchard-description':
        return {
          title: 'AI Description Helper',
          description: 'Create engaging orchard descriptions',
          placeholder: 'Tell me about your orchard and what support you need',
          buttonText: 'Generate Description',
          icon: Wand2
        };
      case 'video-script':
        return {
          title: 'Quick Script Generator',
          description: 'Create video scripts for your content',
          placeholder: 'Describe the video you want to create',
          buttonText: 'Generate Script',
          icon: Sparkles
        };
      case 'video-ideas':
        return {
          title: 'Video Ideas Generator',
          description: 'Get creative ideas for your next video',
          placeholder: 'What topic or product do you want to create videos about?',
          buttonText: 'Generate Ideas',
          icon: Sparkles
        };
      default:
        return {
          title: 'AI Assistant',
          description: 'Get AI-powered help',
          placeholder: placeholder || 'Describe what you need help with',
          buttonText: 'Generate',
          icon: Sparkles
        };
    }
  };

  const config = getTypeConfig();
  const Icon = config.icon;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter a description",
        description: "Tell us what you'd like help with",
        variant: "destructive",
      });
      return;
    }

    try {
      let response;
      const aiFunction = getAIFunction();
      
      if (type === 'orchard-title' || type === 'orchard-description') {
        // Use content ideas generator for orchard content
        response = await generateContentIdeas({
          productDescription: prompt,
          contentType: type === 'orchard-title' ? 'titles' : 'descriptions',
          customPrompt: type === 'orchard-title' 
            ? 'Generate 5 compelling, concise titles for this orchard that would attract community support. Focus on clear benefits and emotional connection.'
            : 'Generate a detailed, engaging description for this orchard that explains the need, impact, and why the community should support it. Include specific benefits and outcomes.'
        });
      } else if (type === 'video-script') {
        response = await generateScript({
          productDescription: prompt,
          targetAudience: 'agricultural community',
          videoLength: 45,
          style: 'informative'
        });
      } else {
        response = await aiFunction({
          productDescription: prompt,
          customPrompt: `Generate helpful content for: ${prompt}`
        });
      }
      
      setResult(response);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleCopyAndUse = () => {
    let contentToUse = '';
    
    if (type === 'video-script' && result?.script) {
      contentToUse = result.script;
    } else if (result?.ideas) {
      contentToUse = result.ideas;
    } else if (result?.tips) {
      contentToUse = result.tips;
    }

    if (contentToUse && onContentGenerated) {
      onContentGenerated(contentToUse);
      toast({
        title: "Content Added!",
        description: "AI-generated content has been added to your form.",
      });
      setIsOpen(false);
      setResult(null);
      setPrompt('');
    }
  };

  if (compact && !isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Sparkles className="h-4 w-4" />
        AI Help
      </Button>
    );
  }

  if (!isOpen && !compact) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-800 drop-shadow-sm">{config.title}</h3>
                <p className="text-xs text-slate-700 drop-shadow-sm border border-white/30 bg-white/50 px-2 py-1 rounded backdrop-blur-sm">{config.description}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Try AI Helper
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {config.title}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false);
              setResult(null);
              setPrompt('');
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <>
            <Textarea
              placeholder={config.placeholder}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {prompt.length}/500 characters
              </span>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {config.buttonText}
                  </>
                )}
              </Button>
            </div>
            
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Quick suggestions:</p>
                <div className="flex flex-wrap gap-1">
                  {suggestions.map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 text-xs"
                      onClick={() => setPrompt(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-background/50 p-4 rounded-lg">
              <div className="text-sm whitespace-pre-wrap">
                {type === 'video-script' && result?.script ? result.script :
                 result?.ideas || result?.tips || 'Generated content'}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopyAndUse}
                className="flex items-center gap-2 flex-1"
                size="sm"
              >
                <Copy className="h-4 w-4" />
                Use This Content
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setPrompt('');
                }}
                size="sm"
              >
                Generate New
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};