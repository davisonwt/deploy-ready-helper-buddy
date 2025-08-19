import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, FileText, TrendingUp, Camera, Sparkles, Star, History, RefreshCcw, Video, Upload } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { useAuth } from '@/hooks/useAuth';
import { GenerateScriptForm } from '@/components/ai/GenerateScriptForm';
import { GenerateMarketingTipsForm } from '@/components/ai/GenerateMarketingTipsForm';
import { GenerateThumbnailForm } from '@/components/ai/GenerateThumbnailForm';
import { GenerateContentIdeasForm } from '@/components/ai/GenerateContentIdeasForm';
import { AICreationsList } from '@/components/ai/AICreationsList';
import { ExampleTemplates } from '@/components/ai/ExampleTemplates';
import { VideoUploadForm } from '@/components/ai/VideoUploadForm';
import { VideoMarketingDashboard } from '@/components/ai/VideoMarketingDashboard';
import { VideoCreationWizard } from '@/components/ai/VideoCreationWizard';

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('thumbnails');
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
        <div className="flex gap-4 justify-center flex-wrap">
          <Button
            variant="outline"
            onClick={() => setActiveTab('thumbnails')}
            className={`flex-1 max-w-xs h-20 flex-col gap-2 border-2 transition-all duration-200 hover:scale-105 ${
              activeTab === 'thumbnails' 
                ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-lg' 
                : 'bg-purple-50 border-purple-300 text-purple-600 hover:bg-purple-100'
            }`}
          >
            <Camera className="w-6 h-6" />
            <div className="text-center">
              <p className="text-sm font-medium">Thumbnails</p>
              <p className="text-xs opacity-80">Eye-catching visuals</p>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab('ideas')}
            className={`flex-1 max-w-xs h-20 flex-col gap-2 border-2 transition-all duration-200 hover:scale-105 ${
              activeTab === 'ideas' 
                ? 'bg-orange-100 border-orange-500 text-orange-700 shadow-lg' 
                : 'bg-orange-50 border-orange-300 text-orange-600 hover:bg-orange-100'
            }`}
          >
            <Lightbulb className="w-6 h-6" />
            <div className="text-center">
              <p className="text-sm font-medium">Content Ideas</p>
              <p className="text-xs opacity-80">Creative inspiration</p>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab('videos')}
            className={`flex-1 max-w-xs h-20 flex-col gap-2 border-2 transition-all duration-200 hover:scale-105 ${
              activeTab === 'videos' 
                ? 'bg-green-100 border-green-500 text-green-700 shadow-lg' 
                : 'bg-green-50 border-green-300 text-green-600 hover:bg-green-100'
            }`}
          >
            <Video className="w-6 h-6" />
            <div className="text-center">
              <p className="text-sm font-medium">Video Marketing</p>
              <p className="text-xs opacity-80">Upload & optimize</p>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveTab('library')}
            className={`flex-1 max-w-xs h-20 flex-col gap-2 border-2 transition-all duration-200 hover:scale-105 ${
              activeTab === 'library' 
                ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-lg' 
                : 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <History className="w-6 h-6" />
            <div className="text-center">
              <p className="text-sm font-medium">My Library</p>
              <p className="text-xs opacity-80">Saved creations</p>
            </div>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">


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

        <TabsContent value="videos" className="space-y-6">
          <Tabs defaultValue="wizard" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Video className="w-6 h-6" />
                Complete Video Marketing Solution
              </h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.querySelector('[value="wizard"]').click()}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Creation Wizard
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.querySelector('[value="upload"]').click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Tools
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.querySelector('[value="manage"]').click()}
                >
                  <Video className="w-4 h-4 mr-2" />
                  My Videos
                </Button>
              </div>
            </div>
            
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="wizard" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Creation Wizard
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload & Tools
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                My Videos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="wizard">
              <VideoCreationWizard />
            </TabsContent>
            
            <TabsContent value="upload">
              <VideoUploadForm onVideoUploaded={() => {
                // Switch to manage tab after upload
                setTimeout(() => {
                  document.querySelector('[value="manage"]').click();
                }, 1000);
              }} />
            </TabsContent>
            
            <TabsContent value="manage">
              <VideoMarketingDashboard />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="library">
          <AICreationsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}