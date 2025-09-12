import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Paperclip, 
  X, 
  Upload, 
  Image, 
  FileText, 
  Video, 
  Music,
  File,
  AlertCircle
} from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useToast } from '@/hooks/use-toast';

const getFileIcon = (fileType) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType.startsWith('video/')) return Video;
  if (fileType.startsWith('audio/')) return Music;
  if (fileType.includes('pdf') || fileType.includes('document')) return FileText;
  return File;
};

const getFileTypeCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

const FileUploadArea = ({ 
  onFileSelect, 
  selectedFile, 
  onRemoveFile, 
  uploading = false,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: `File size must be less than ${formatFileSize(maxFileSize)}. Your file is ${formatFileSize(file.size)}.`,
        variant: "destructive",
      });
      return false;
    }

    // Check file type if acceptedTypes is specified
    if (acceptedTypes) {
      const acceptedArray = acceptedTypes.split(',').map(type => type.trim());
      const isAccepted = acceptedArray.some(accepted => {
        if (accepted.startsWith('.')) {
          return file.name.toLowerCase().endsWith(accepted.toLowerCase());
        }
        if (accepted.includes('/*')) {
          const baseType = accepted.split('/')[0];
          return file.type.startsWith(baseType + '/');
        }
        return file.type === accepted;
      });

      if (!isAccepted) {
        toast({
          title: "Invalid file type",
          description: "Please select a supported file type.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleFileSelect = (file) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (selectedFile) {
    const FileIcon = getFileIcon(selectedFile.type);
    const fileType = getFileTypeCategory(selectedFile.type);

    return (
      <Card className="border-dashed border-2 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileIcon className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium truncate">
                  {selectedFile.name}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {fileType}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
              
              {uploading && (
                <div className="mt-2">
                  <Progress value={uploadProgress} className="h-1" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemoveFile}
              disabled={uploading}
              className="flex-shrink-0 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        accept={acceptedTypes}
        className="hidden"
      />
      
      <Card 
        className={`border-dashed border-2 transition-colors cursor-pointer ${
          dragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            
            <h3 className="text-sm font-medium mb-1">
              Drop files here or click to upload
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Maximum file size: {formatFileSize(maxFileSize)}
            </p>
            
            <div className="flex flex-wrap justify-center gap-1 mb-3">
              <Badge variant="outline" className="text-xs">
                <Image className="h-3 w-3 mr-1" />
                Images
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Video className="h-3 w-3 mr-1" />
                Videos
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Music className="h-3 w-3 mr-1" />
                Audio
              </Badge>
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Documents
              </Badge>
            </div>
            
            <Button variant="outline" size="sm" className="pointer-events-none">
              <Paperclip className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUploadArea;