import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Upload, Video, FileText, Wand2, Play, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AIVideoGenerator } from './AIVideoGenerator';
import { SmartHashtagGenerator } from './SmartHashtagGenerator';

export const VideoUploadForm = ({ onVideoUploaded }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [generatingContent, setGeneratingContent] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('video/')) {
        toast({
          title: "Invalid file type",
          description: "Please select a video file",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (max 100MB)
      if (selectedFile.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a video file smaller than 100MB",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const uploadToStorage = async () => {
    if (!file || !user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('marketing-videos')
      .upload(fileName, file, {
        onUploadProgress: (progress) => {
          setProgress((progress.loaded / progress.total) * 100);
        }
      });

    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('marketing-videos')
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  };

  const generateAIContent = async (videoTitle, videoDescription) => {
    setGeneratingContent(true);
    try {
      // Generate AI-powered marketing content for the video
      const { data, error } = await supabase.functions.invoke('generate-content-ideas', {
        body: {
          productDescription: `Video titled "${videoTitle}": ${videoDescription}`,
          targetAudience: 'Social media users',
          contentType: 'video-marketing',
          customPrompt: 'Generate engaging descriptions, hashtags, and platform-specific optimization suggestions for this video to attract bestowers (buyers) on social media platforms.'
        }
      });

      if (error) throw error;
      return data.ideas;
    } catch (error) {
      console.error('AI content generation failed:', error);
      return null;
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !user || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a video file and provide a title",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Upload video to storage
      const videoUrl = await uploadToStorage();
      
      // Generate AI content
      const aiContent = await generateAIContent(title, description);
      
      // Save video metadata to database
      const { data: videoData, error } = await supabase
        .from('video_content')
        .insert({
          user_id: user.id,
          video_url: videoUrl,
          title: title.trim(),
          description: description.trim() || null,
          tags: tags.trim() ? tags.split(',').map(tag => tag.trim()) : [],
          ai_generated_description: aiContent,
          file_size: file.size,
          duration: null // Could be extracted with video processing
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Video uploaded successfully!",
        description: "Your video is ready for marketing across platforms"
      });

      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setTags('');
      setPreviewUrl(null);
      setProgress(0);
      
      if (onVideoUploaded) {
        onVideoUploaded(videoData);
      }

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Tabs defaultValue="upload" className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Video className="w-6 h-6" />
          Video Marketing Toolkit
        </h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => document.querySelector('[value="upload"]').click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => document.querySelector('[value="generate"]').click()}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => document.querySelector('[value="hashtags"]').click()}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Hashtags
          </Button>
        </div>
      </div>
      
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upload" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Video
        </TabsTrigger>
        <TabsTrigger value="generate" className="flex items-center gap-2">
          <Wand2 className="w-4 h-4" />
          AI Generate
        </TabsTrigger>
        <TabsTrigger value="hashtags" className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Smart Hashtags
        </TabsTrigger>
      </TabsList>

      {/* Upload Tab */}
      <TabsContent value="upload" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Marketing Video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="video-upload">Select Video File</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {!file ? (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('video-upload').click()}
                    >
                      Choose Video File
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      MP4, MOV, AVI up to 100MB
                    </p>
                  </>
                ) : (
                  <div className="space-y-4">
                    {previewUrl && (
                      <video
                        src={previewUrl}
                        controls
                        className="w-full max-w-md mx-auto rounded-lg"
                      />
                    )}
                    <p className="text-sm text-gray-600">
                      {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFile(null);
                        setPreviewUrl(null);
                      }}
                    >
                      Change File
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Video Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Video Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter an engaging title for your video"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what your video is about and why it will attract bestowers"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., marketing, product, demo, tutorial"
                />
              </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading video...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
                {generatingContent && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Wand2 className="w-4 h-4 animate-spin" />
                    Generating AI marketing content...
                  </div>
                )}
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!file || !title.trim() || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Uploading & Generating Content...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Upload Video & Generate Marketing Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Upload Info */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Upload className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-purple-900 mb-1">Upload & Optimize</h3>
                <p className="text-sm text-purple-700">
                  Upload your existing videos and our AI will enhance them with:
                </p>
                <ul className="text-sm text-purple-600 mt-2 space-y-1">
                  <li>• Platform-specific descriptions</li>
                  <li>• Trending hashtags for maximum reach</li>
                  <li>• Sow2Grow marketplace optimization</li>
                  <li>• Bestower attraction strategies</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* AI Generate Tab */}
      <TabsContent value="generate">
        <AIVideoGenerator onVideoGenerated={onVideoUploaded} />
      </TabsContent>

      {/* Smart Hashtags Tab */}
      <TabsContent value="hashtags">
        <SmartHashtagGenerator productDescription={description} />
      </TabsContent>
    </Tabs>
  );
};