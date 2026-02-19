import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { FileText, Upload, X, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface SegmentDocumentPickerProps {
  currentDocumentName?: string;
  currentDocumentUrl?: string;
  onAttach: (doc: { name: string; url: string }) => void;
  onClear: () => void;
}

export const SegmentDocumentPicker: React.FC<SegmentDocumentPickerProps> = ({
  currentDocumentName,
  currentDocumentUrl,
  onAttach,
  onClear,
}) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, DOC, DOCX, and TXT files are supported');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum 20MB.');
      return;
    }

    try {
      setUploading(true);
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('segment-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('segment-documents')
        .getPublicUrl(filePath);

      onAttach({ name: file.name, url: publicUrl });
      toast.success('Document attached!');
    } catch (err: any) {
      console.error('Document upload error:', err);
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  if (currentDocumentName) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <FileText className="h-3 w-3 text-primary shrink-0" />
        <span className="text-[11px] text-primary truncate max-w-[140px]">{currentDocumentName}</span>
        {currentDocumentUrl && (
          <a
            href={currentDocumentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="h-3 w-3" />
          </a>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="ml-auto text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={onFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-primary px-1.5"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <FileText className="h-3 w-3" />
        )}
        {uploading ? 'Uploading...' : 'Attach Document'}
      </Button>
    </div>
  );
};
