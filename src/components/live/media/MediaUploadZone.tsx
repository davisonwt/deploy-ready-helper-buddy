import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaUploadZoneProps {
  accept: string;
  onUpload: (files: File[]) => void;
  uploading: boolean;
  mediaType: string;
}

export function MediaUploadZone({ accept, onUpload, uploading, mediaType }: MediaUploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.split(',').reduce((acc, ext) => ({ ...acc, [ext.trim()]: [] }), {}),
    disabled: uploading,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
        isDragActive && 'border-primary bg-primary/5 scale-105',
        uploading && 'opacity-50 cursor-not-allowed',
        !isDragActive && !uploading && 'hover:border-primary/50 hover:bg-accent/50'
      )}
    >
      <input {...getInputProps()} />
      
      <div className="space-y-3">
        {uploading ? (
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
        ) : (
          <Upload className={cn(
            'h-12 w-12 mx-auto transition-transform',
            isDragActive && 'scale-110 text-primary'
          )} />
        )}
        
        <div className="space-y-1">
          <p className="font-semibold">
            {uploading ? 'Uploading...' : isDragActive ? 'Drop files here' : `Drop ${mediaType} here`}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse your files
          </p>
          <p className="text-xs text-muted-foreground">
            Supported: {accept}
          </p>
        </div>
      </div>
    </div>
  );
}
