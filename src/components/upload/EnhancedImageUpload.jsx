import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  X, 
  Image as ImageIcon, 
  Loader2, 
  AlertTriangle, 
  CheckCircle,
  FileImage,
  Camera 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const EnhancedImageUpload = ({ 
  onUpload, 
  maxFiles = 5, 
  maxFileSize = 5 * 1024 * 1024, // 5MB
  bucket = 'orchard-images',
  folder = 'uploads/',
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  existingImages = [],
  disabled = false 
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  // File validation
  const validateFile = (file) => {
    const errors = [];
    
    if (!acceptedTypes.includes(file.type)) {
      errors.push(`${file.name}: Invalid file type. Accepted types: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`);
    }
    
    if (file.size > maxFileSize) {
      errors.push(`${file.name}: File too large. Maximum size: ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`);
    }
    
    return errors;
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    const totalFiles = files.length + existingImages.length + fileArray.length;
    
    if (totalFiles > maxFiles) {
      toast({
        variant: 'destructive',
        title: 'Too many files',
        description: `Maximum ${maxFiles} files allowed. You can upload ${maxFiles - files.length - existingImages.length} more.`
      });
      return;
    }

    let allErrors = [];
    const validFiles = [];

    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        allErrors = [...allErrors, ...fileErrors];
      } else {
        // Create preview URL
        const preview = URL.createObjectURL(file);
        validFiles.push({
          id: Date.now() + Math.random(),
          file,
          preview,
          name: file.name,
          size: file.size,
          status: 'pending'
        });
      }
    });

    if (allErrors.length > 0) {
      setErrors(allErrors);
      toast({
        variant: 'destructive',
        title: 'File validation errors',
        description: `${allErrors.length} error(s) found`
      });
    } else {
      setErrors([]);
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, [files.length, existingImages.length, maxFiles, maxFileSize, acceptedTypes, toast]);

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  }, [handleFileSelect]);

  // Remove file
  const removeFile = (fileId) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke object URL to free memory
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
    
    // Remove from upload progress
    setUploadProgress(prev => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
  };

  // Upload files
  const uploadFiles = async () => {
    if (files.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No files selected',
        description: 'Please select files to upload'
      });
      return;
    }

    setUploading(true);
    const uploadResults = [];

    try {
      // Upload files sequentially to avoid overwhelming the API
      for (const fileData of files) {
        try {
          setUploadProgress(prev => ({ ...prev, [fileData.id]: 0 }));
          
          // Generate unique filename
          const fileExt = fileData.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${folder}${fileName}`;

          // Simulate upload progress (Supabase doesn't provide real progress)
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => ({
              ...prev,
              [fileData.id]: Math.min((prev[fileData.id] || 0) + 10, 90)
            }));
          }, 100);

          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileData.file, {
              cacheControl: '3600',
              upsert: false,
              contentType: fileData.file.type
            });

          clearInterval(progressInterval);

          if (error) {
            throw error;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          setUploadProgress(prev => ({ ...prev, [fileData.id]: 100 }));
          
          uploadResults.push({
            id: fileData.id,
            url: publicUrl,
            filename: fileName,
            originalName: fileData.file.name,
            size: fileData.file.size
          });

          // Update file status
          setFiles(prev => prev.map(f => 
            f.id === fileData.id ? { ...f, status: 'uploaded', url: publicUrl } : f
          ));

        } catch (uploadError) {
          console.error(`Upload failed for ${fileData.file.name}:`, uploadError);
          
          setFiles(prev => prev.map(f => 
            f.id === fileData.id ? { ...f, status: 'error', error: uploadError.message } : f
          ));
          
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: `Failed to upload ${fileData.file.name}: ${uploadError.message}`
          });
        }
      }

      if (uploadResults.length > 0) {
        toast({
          title: 'Upload successful',
          description: `Successfully uploaded ${uploadResults.length} file(s)`
        });
        
        if (onUpload) {
          onUpload(uploadResults);
        }
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload files'
      });
    } finally {
      setUploading(false);
    }
  };

  // Clear all files
  const clearFiles = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setUploadProgress({});
    setErrors([]);
  };

  const totalFiles = files.length + existingImages.length;
  const canAddMore = totalFiles < maxFiles;
  const hasValidFiles = files.some(f => f.status !== 'error');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ImageIcon className="h-5 w-5 mr-2" />
          Image Upload
          {maxFiles > 1 && (
            <Badge variant="outline" className="ml-2">
              {totalFiles}/{maxFiles}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {canAddMore && !disabled && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-2">
              <div className="flex justify-center">
                {dragOver ? (
                  <Camera className="h-12 w-12 text-blue-500" />
                ) : (
                  <Upload className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-lg font-medium">
                  {dragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} up to {(maxFileSize / 1024 / 1024).toFixed(1)}MB each
                </p>
                {maxFiles > 1 && (
                  <p className="text-sm text-gray-500">
                    You can upload {maxFiles - totalFiles} more file(s)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled || !canAddMore}
        />

        {/* Errors Display */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {errors.map((error, index) => (
                  <div key={index} className="text-sm">{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Files Preview */}
        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Selected Files</h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFiles}
                disabled={uploading}
              >
                Clear All
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((fileData) => (
                <div key={fileData.id} className="relative border rounded-lg overflow-hidden">
                  <div className="aspect-square relative">
                    <img
                      src={fileData.preview}
                      alt={fileData.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Status Overlay */}
                    <div className="absolute top-2 right-2">
                      {fileData.status === 'uploaded' && (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Uploaded
                        </Badge>
                      )}
                      {fileData.status === 'error' && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                      {fileData.status === 'pending' && uploadProgress[fileData.id] !== undefined && (
                        <Badge variant="secondary">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          {uploadProgress[fileData.id]}%
                        </Badge>
                      )}
                    </div>

                    {/* Remove Button */}
                    {!uploading && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 left-2 h-6 w-6 p-0"
                        onClick={() => removeFile(fileData.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="p-2">
                    <p className="text-sm font-medium truncate" title={fileData.name}>
                      {fileData.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(fileData.size / 1024).toFixed(1)} KB
                    </p>
                    
                    {/* Upload Progress */}
                    {uploadProgress[fileData.id] !== undefined && fileData.status === 'pending' && (
                      <Progress 
                        value={uploadProgress[fileData.id]} 
                        className="mt-2 h-1"
                      />
                    )}
                    
                    {/* Error Message */}
                    {fileData.status === 'error' && fileData.error && (
                      <p className="text-xs text-red-500 mt-1">
                        {fileData.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && hasValidFiles && (
          <Button 
            onClick={uploadFiles}
            disabled={uploading || disabled}
            className="w-full"
            size="lg"
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? 'Uploading...' : `Upload ${files.filter(f => f.status !== 'error').length} File(s)`}
          </Button>
        )}

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Existing Images</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {existingImages.map((image, index) => (
                <div key={index} className="aspect-square relative border rounded overflow-hidden">
                  <img
                    src={image.url || image}
                    alt={`Existing image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Badge className="absolute top-1 right-1 text-xs">
                    Existing
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedImageUpload;
