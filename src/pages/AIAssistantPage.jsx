import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, FileText, TrendingUp, Camera, Sparkles, Star, History, RefreshCcw } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useAuth } from '@/hooks/useAuth';
import { GenerateScriptForm } from '@/components/ai/GenerateScriptForm';
import { GenerateMarketingTipsForm } from '@/components/ai/GenerateMarketingTipsForm';
import { GenerateThumbnailForm } from '@/components/ai/GenerateThumbnailForm';
import { GenerateContentIdeasForm } from '@/components/ai/GenerateContentIdeasForm';
import { AICreationsList } from '@/components/ai/AICreationsList';
import { ExampleTemplates } from '@/components/ai/ExampleTemplates';

export const AIAssistantPage = () => {
  const [activeTab, setActiveTab] = useState('scripts');
  const { usage, limit, getCurrentUsage } = useAIAssistant();
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
            <Lightbulb className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">AI Marketing Assistant</h1>
          <p className="text-muted-foreground">Please log in to access your AI-powered marketing tools.</p>
          <Button asChild>
            <a href="/login">Sign In</a>
          </Button>
        </div>
      </div>
    );
  }

  const usagePercentage = (usage / limit) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">AI Marketing Assistant</h1>
            </div>
            <p className="text-muted-foreground">
              Create engaging content for your agricultural products and services with AI
            </p>
          </div>
          
          {/* Usage indicator */}
          <Card className="w-64">
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

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium">Video Scripts</p>
              <p className="text-xs text-muted-foreground">30-60s promotional content</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium">Marketing Tips</p>
              <p className="text-xs text-muted-foreground">Platform-specific strategies</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Camera className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-sm font-medium">Thumbnails</p>
              <p className="text-xs text-muted-foreground">Eye-catching visuals</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Lightbulb className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-sm font-medium">Content Ideas</p>
              <p className="text-xs text-muted-foreground">Creative inspiration</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="scripts" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="tips" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Tips
          </TabsTrigger>
          <TabsTrigger value="thumbnails" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Thumbnails
          </TabsTrigger>
          <TabsTrigger value="ideas" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Ideas
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            My Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scripts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generate Video Script
              </CardTitle>
              <CardDescription>
                Create engaging scripts for 30-60 second promotional videos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateScriptForm />
            </CardContent>
          </Card>
          <ExampleTemplates type="script" />
        </TabsContent>

        <TabsContent value="tips" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Generate Marketing Tips
              </CardTitle>
              <CardDescription>
                Get actionable marketing strategies for your products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateMarketingTipsForm />
            </CardContent>
          </Card>
          <ExampleTemplates type="tips" />
        </TabsContent>

        <TabsContent value="thumbnails" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Generate Thumbnail
              </CardTitle>
              <CardDescription>
                Create eye-catching thumbnails for your videos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateThumbnailForm />
            </CardContent>
          </Card>
          <ExampleTemplates type="thumbnail" />
        </TabsContent>

        <TabsContent value="ideas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Generate Content Ideas
              </CardTitle>
              <CardDescription>
                Get creative inspiration for your marketing content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GenerateContentIdeasForm />
            </CardContent>
          </Card>
          <ExampleTemplates type="ideas" />
        </TabsContent>

        <TabsContent value="library">
          <AICreationsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};