import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Upload, Video, Image, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VideoProcessingWidget } from './VideoProcessingWidget';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useAuth } from '@/hooks/useAuth';

export const VideoUploadWithProcessing = ({ onVideoUploaded }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [processedVideo, setProcessedVideo] = useState(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [uploadStep, setUploadStep] = useState('select'); // select, process, upload, complete

  const { toast } = useToast();
  const { user } = useAuth();
  const { uploadFile, uploading, error } = useFileUpload();

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
      
      // Validate file size (max 500MB for processing)
      if (selectedFile.size > 500 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a video file smaller than 500MB",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setUploadStep('process');
    }
  };

  const handleProcessingComplete = (results) => {
    setProcessedVideo(results);
    setUploadStep('upload');
    
    // Auto-select the first thumbnail
    if (results.thumbnails && results.thumbnails.length > 0) {
      setSelectedThumbnail(results.thumbnails[0]);
    }
  };

  const handleUpload = async () => {
    if (!processedVideo || !user || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please complete video processing and provide a title",
        variant: "destructive"
      });
      return;
    }

    try {
      // Upload compressed video
      const videoResult = await uploadFile(
        processedVideo.compressedFile, 
        'community-videos', 
        'processed/'
      );

      if (!videoResult.success) {
        throw new Error(videoResult.error);
      }

      // Upload selected thumbnail if available
      let thumbnailUrl = null;
      if (selectedThumbnail) {
        const thumbnailFile = new File([selectedThumbnail.blob], 'thumbnail.jpg', {
          type: 'image/jpeg'
        });
        
        const thumbnailResult = await uploadFile(
          thumbnailFile,
          'community-videos',
          'thumbnails/'
        );

        if (thumbnailResult.success) {
          thumbnailUrl = thumbnailResult.data.url;
        }
      }

      // Create video record with enhanced metadata
      const videoData = {
        user_id: user.id,
        video_url: videoResult.data.url,
        thumbnail_url: thumbnailUrl,
        title: title.trim(),
        description: description.trim() || null,
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()) : [],
        file_size: processedVideo.compressedFile.size,
        original_file_size: processedVideo.originalFile.size,
        compression_ratio: processedVideo.compressionRatio,
        duration_seconds: Math.round(processedVideo.metadata.duration),
        width: processedVideo.metadata.width,
        height: processedVideo.metadata.height,
        status: 'pending'
      };

      toast({
        title: "Video uploaded successfully!",
        description: `Compressed ${processedVideo.compressionRatio.toFixed(1)}x and uploaded with thumbnail`
      });

      setUploadStep('complete');
      
      if (onVideoUploaded) {
        onVideoUploaded(videoData);
      }

      // Reset form after delay
      setTimeout(() => {
        resetForm();
      }, 3000);

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload video",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl(null);
    setTitle('');
    setDescription('');
    setTags('');
    setProcessedVideo(null);
    setSelectedThumbnail(null);
    setUploadStep('select');
  };

  const renderStepContent = () => {
    switch (uploadStep) {
      case 'select':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Select Video File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('video-upload').click()}
                >
                  Choose Video File
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  MP4, MOV, AVI, WebM up to 500MB
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'process':
        return (
          <div className="space-y-6">
            {previewUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Original Video Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <video
                    src={previewUrl}
                    controls
                    className="w-full max-w-md mx-auto rounded-lg"
                  />
                </CardContent>
              </Card>
            )}
            
            <VideoProcessingWidget
              file={file}
              onProcessingComplete={handleProcessingComplete}
              onThumbnailSelect={setSelectedThumbnail}
            />
          </div>
        );

      case 'upload':
        return (
          <div className="space-y-6">
            {/* Processing Results Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Processing Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Compression Results</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Original: {(processedVideo.originalFile.size / (1024 * 1024)).toFixed(1)}MB</p>
                    <p>Compressed: {(processedVideo.compressedFile.size / (1024 * 1024)).toFixed(1)}MB</p>
                    <p>Reduction: {((1 - processedVideo.compressedFile.size / processedVideo.originalFile.size) * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Thumbnails</h4>
                  <div className="text-sm text-gray-600">
                    <p>{processedVideo.thumbnails?.length || 0} thumbnails generated</p>
                    {selectedThumbnail && (
                      <img 
                        src={selectedThumbnail.url} 
                        alt="Selected thumbnail"
                        className="w-20 h-12 object-cover rounded mt-2"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video Details Form */}
            <Card>
              <CardHeader>
                <CardTitle>Video Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
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
                    placeholder="Describe your video content"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., marketing, product, demo"
                  />
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={!title.trim() || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Upload Processed Video
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'complete':
        return (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Complete!</h3>
              <p className="text-gray-600 mb-4">
                Your video has been processed and uploaded successfully.
              </p>
              <Button onClick={resetForm}>
                Upload Another Video
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Enhanced Video Upload</h2>
        <div className="flex items-center gap-2 text-sm">
          <span className={uploadStep === 'select' ? 'font-semibold' : 'text-gray-500'}>
            1. Select
          </span>
          <span>→</span>
          <span className={uploadStep === 'process' ? 'font-semibold' : 'text-gray-500'}>
            2. Process
          </span>
          <span>→</span>
          <span className={uploadStep === 'upload' ? 'font-semibold' : 'text-gray-500'}>
            3. Upload
          </span>
          <span>→</span>
          <span className={uploadStep === 'complete' ? 'font-semibold' : 'text-gray-500'}>
            4. Complete
          </span>
        </div>
      </div>

      {renderStepContent()}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};