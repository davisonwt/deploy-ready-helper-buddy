import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VehicleImageUploadProps {
  images: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  existingUrls: string[];
  setExistingUrls: React.Dispatch<React.SetStateAction<string[]>>;
}

const MAX_FILES = 3;
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

const VehicleImageUpload: React.FC<VehicleImageUploadProps> = ({
  images,
  setImages,
  existingUrls,
  setExistingUrls,
}) => {
  const totalImages = images.length + existingUrls.filter(url => !url.startsWith('blob:')).length;

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach(file => {
      if (file.errors?.some((e: any) => e.code === 'file-too-large')) {
        toast.error(`${file.file.name} is too large. Max size is 5MB.`);
      } else if (file.errors?.some((e: any) => e.code === 'file-invalid-type')) {
        toast.error(`${file.file.name} is not a supported format. Use JPEG or PNG.`);
      }
    });

    // Check total limit
    const remainingSlots = MAX_FILES - totalImages;
    if (acceptedFiles.length > remainingSlots) {
      toast.error(`You can only upload ${remainingSlots} more image(s). Maximum is ${MAX_FILES}.`);
      acceptedFiles = acceptedFiles.slice(0, remainingSlots);
    }

    if (acceptedFiles.length > 0) {
      setImages(prev => [...prev, ...acceptedFiles]);
    }
  }, [totalImages, setImages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
    maxSize: MAX_SIZE,
    disabled: totalImages >= MAX_FILES,
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingUrl = (index: number) => {
    setExistingUrls(prev => prev.filter((_, i) => i !== index));
  };

  const existingNonBlobUrls = existingUrls.filter(url => !url.startsWith('blob:'));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Vehicle Photos</h4>
          <p className="text-sm text-muted-foreground">
            Upload up to 3 photos of your vehicle (JPEG/PNG, max 5MB each)
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {totalImages}/{MAX_FILES}
        </span>
      </div>

      {/* Dropzone */}
      {totalImages < MAX_FILES && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-primary">Drop your images here...</p>
          ) : (
            <>
              <p className="text-foreground">
                Drag & drop images here, or click to select
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                JPEG or PNG, up to 5MB each
              </p>
            </>
          )}
        </div>
      )}

      {/* Existing Images Preview */}
      {existingNonBlobUrls.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground">Current Photos</h5>
          <div className="grid grid-cols-3 gap-4">
            {existingNonBlobUrls.map((url, index) => (
              <div key={`existing-${index}`} className="relative group">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={url}
                    alt={`Vehicle photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeExistingUrl(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Images Preview */}
      {images.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium text-muted-foreground">New Photos</h5>
          <div className="grid grid-cols-3 gap-4">
            {images.map((file, index) => (
              <div key={`new-${index}`} className="relative group">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`New photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
                <span className="absolute bottom-2 left-2 text-xs bg-background/80 px-2 py-1 rounded">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalImages === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No photos uploaded yet</p>
          <p className="text-sm">Add photos to showcase your vehicle to the community</p>
        </div>
      )}
    </div>
  );
};

export default VehicleImageUpload;
