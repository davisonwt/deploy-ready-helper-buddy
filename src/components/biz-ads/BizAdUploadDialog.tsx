import React, { useState, useCallback, useRef } from 'react';
import { Upload, Loader2, Mic, Square, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const VISUAL_TYPES: Record<string, string[]> = {
  'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/gif': [],
  'video/mp4': [], 'video/webm': [], 'video/quicktime': [],
};
const AUDIO_TYPES: Record<string, string[]> = {
  'audio/mpeg': [], 'audio/wav': [], 'audio/ogg': [], 'audio/mp4': [], 'audio/webm': [],
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}

export default function BizAdUploadDialog({ open, onOpenChange, userId }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visualFile, setVisualFile] = useState<File | null>(null);
  const [voiceoverFile, setVoiceoverFile] = useState<File | null>(null);
  const [overlayHeadline, setOverlayHeadline] = useState('');
  const [overlayTagline, setOverlayTagline] = useState('');
  const [overlayPosition, setOverlayPosition] = useState('bottom');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const onDropVisual = useCallback((files: File[]) => { if (files[0]) setVisualFile(files[0]); }, []);
  const onDropVoiceover = useCallback((files: File[]) => { if (files[0]) setVoiceoverFile(files[0]); }, []);

  const visualDz = useDropzone({ onDrop: onDropVisual, accept: VISUAL_TYPES, multiple: false, disabled: uploading });
  const voiceoverDz = useDropzone({ onDrop: onDropVoiceover, accept: AUDIO_TYPES, multiple: false, disabled: uploading });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voiceover-${Date.now()}.webm`, { type: 'audio/webm' });
        setVoiceoverFile(file);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const getMediaType = (file: File) => file.type.startsWith('video/') ? 'video' : 'image';

  const getDuration = (file: File): Promise<number> =>
    new Promise(resolve => {
      const el = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => { URL.revokeObjectURL(el.src); resolve(Math.round(el.duration)); };
      el.onerror = () => resolve(0);
      el.src = URL.createObjectURL(file);
    });

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split('.').pop();
    const path = `${userId}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('biz-ads').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return supabase.storage.from('biz-ads').getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!visualFile || !title.trim()) { toast.error('Title and visual are required'); return; }
    setUploading(true);
    try {
      const mediaUrl = await uploadFile(visualFile, 'visuals');
      let voiceoverUrl: string | null = null;
      if (voiceoverFile) voiceoverUrl = await uploadFile(voiceoverFile, 'voiceovers');

      const mediaType = getMediaType(visualFile);
      let duration: number | null = null;
      if (visualFile.type.startsWith('video/')) duration = await getDuration(visualFile);
      if (voiceoverFile && !duration) duration = await getDuration(voiceoverFile);

      const { error } = await supabase.from('biz_ads').insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        voiceover_url: voiceoverUrl,
        overlay_headline: overlayHeadline.trim() || null,
        overlay_tagline: overlayTagline.trim() || null,
        overlay_position: overlayPosition,
        duration_seconds: duration,
        file_size: visualFile.size + (voiceoverFile?.size || 0),
        mime_type: visualFile.type,
        status: 'approved',
      });
      if (error) throw error;

      toast.success('Ad uploaded!');
      queryClient.invalidateQueries({ queryKey: ['my-biz-ads'] });
      queryClient.invalidateQueries({ queryKey: ['community-biz-ads'] });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setStep(0); setTitle(''); setDescription(''); setVisualFile(null);
    setVoiceoverFile(null); setOverlayHeadline(''); setOverlayTagline(''); setOverlayPosition('bottom');
  };

  const visualPreviewUrl = visualFile ? URL.createObjectURL(visualFile) : null;

  const steps = ['Details', 'Visual', 'Voiceover', 'Text Overlay', 'Preview'];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Business Ad</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex gap-1 mb-2">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(i)}
              className={cn(
                'flex-1 text-xs py-1.5 rounded-lg font-medium transition-all',
                i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Step 0: Details */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Grand Opening Sale" className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" rows={3} className="mt-1" />
            </div>
            <Button onClick={() => setStep(1)} disabled={!title.trim()} className="w-full">Next → Visual</Button>
          </div>
        )}

        {/* Step 1: Visual */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload an image or short video (max 60s) as the main visual.</p>
            <div
              {...visualDz.getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                visualDz.isDragActive && 'border-primary bg-primary/5',
                !visualDz.isDragActive && 'hover:border-primary/50 hover:bg-accent/50'
              )}
            >
              <input {...visualDz.getInputProps()} />
              {visualFile ? (
                <div className="space-y-2">
                  {visualFile.type.startsWith('video/') ? (
                    <video src={visualPreviewUrl!} className="w-full max-h-48 rounded-lg object-contain mx-auto" controls />
                  ) : (
                    <img src={visualPreviewUrl!} alt="Preview" className="w-full max-h-48 rounded-lg object-contain mx-auto" />
                  )}
                  <p className="text-sm font-medium text-primary">{visualFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(visualFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2 justify-center text-muted-foreground">
                    <Image className="w-8 h-8" />
                    <Video className="w-8 h-8" />
                  </div>
                  <p className="font-medium">Drop image or video here</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP, MP4, WebM</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">← Back</Button>
              <Button onClick={() => setStep(2)} disabled={!visualFile} className="flex-1">Next → Voiceover</Button>
            </div>
          </div>
        )}

        {/* Step 2: Voiceover */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Add an optional voiceover audio track that plays over your visual.</p>

            <Tabs defaultValue="upload">
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex-1">Upload File</TabsTrigger>
                <TabsTrigger value="record" className="flex-1">Record</TabsTrigger>
              </TabsList>
              <TabsContent value="upload">
                <div
                  {...voiceoverDz.getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                    voiceoverDz.isDragActive && 'border-primary bg-primary/5',
                    !voiceoverDz.isDragActive && 'hover:border-primary/50 hover:bg-accent/50'
                  )}
                >
                  <input {...voiceoverDz.getInputProps()} />
                  {voiceoverFile ? (
                    <div className="space-y-2">
                      <p className="font-medium text-primary">{voiceoverFile.name}</p>
                      <audio src={URL.createObjectURL(voiceoverFile)} controls className="w-full" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Mic className="w-10 h-10 mx-auto text-muted-foreground" />
                      <p className="font-medium">Drop audio file here</p>
                      <p className="text-xs text-muted-foreground">MP3, WAV, OGG</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="record">
                <div className="text-center space-y-4 py-4">
                  {recording ? (
                    <>
                      <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center animate-pulse">
                        <Mic className="w-8 h-8 text-destructive" />
                      </div>
                      <p className="text-sm font-medium">Recording...</p>
                      <Button variant="destructive" onClick={stopRecording} className="gap-2">
                        <Square className="w-4 h-4" /> Stop Recording
                      </Button>
                    </>
                  ) : (
                    <>
                      {voiceoverFile ? (
                        <div className="space-y-2">
                          <p className="font-medium text-primary">Recording saved</p>
                          <audio src={URL.createObjectURL(voiceoverFile)} controls className="w-full" />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Click to record a voiceover directly from your mic.</p>
                      )}
                      <Button onClick={startRecording} className="gap-2">
                        <Mic className="w-4 h-4" /> Start Recording
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {voiceoverFile && (
              <Button variant="ghost" size="sm" onClick={() => setVoiceoverFile(null)} className="text-destructive">
                Remove voiceover
              </Button>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
              <Button onClick={() => setStep(3)} className="flex-1">Next → Text Overlay</Button>
            </div>
          </div>
        )}

        {/* Step 3: Text Overlay */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Add optional headline & tagline text that appears on top of your visual.</p>
            <div>
              <Label>Headline</Label>
              <Input value={overlayHeadline} onChange={e => setOverlayHeadline(e.target.value)} placeholder="e.g. 50% OFF TODAY!" className="mt-1" />
            </div>
            <div>
              <Label>Tagline / CTA</Label>
              <Input value={overlayTagline} onChange={e => setOverlayTagline(e.target.value)} placeholder="e.g. Visit us at Main St." className="mt-1" />
            </div>
            <div>
              <Label className="mb-2 block">Text Position</Label>
              <RadioGroup value={overlayPosition} onValueChange={setOverlayPosition} className="flex gap-4">
                {['top', 'center', 'bottom'].map(pos => (
                  <div key={pos} className="flex items-center gap-1.5">
                    <RadioGroupItem value={pos} id={`pos-${pos}`} />
                    <Label htmlFor={`pos-${pos}`} className="capitalize cursor-pointer">{pos}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← Back</Button>
              <Button onClick={() => setStep(4)} className="flex-1">Next → Preview</Button>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Preview your ad before submitting.</p>

            {visualFile && (
              <div className="aspect-video bg-muted rounded-xl overflow-hidden relative">
                {visualFile.type.startsWith('video/') ? (
                  <video src={visualPreviewUrl!} className="w-full h-full object-cover" controls muted={!!voiceoverFile} />
                ) : (
                  <img src={visualPreviewUrl!} alt="Preview" className="w-full h-full object-cover" />
                )}
                {(overlayHeadline || overlayTagline) && (
                  <div
                    className={cn(
                      'absolute left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent',
                      overlayPosition === 'top' && 'top-0 bg-gradient-to-b',
                      overlayPosition === 'center' && 'top-1/2 -translate-y-1/2 bg-black/60',
                      overlayPosition === 'bottom' && 'bottom-0'
                    )}
                  >
                    {overlayHeadline && <p className="text-white font-bold text-lg">{overlayHeadline}</p>}
                    {overlayTagline && <p className="text-white/90 text-sm mt-0.5">{overlayTagline}</p>}
                  </div>
                )}
              </div>
            )}

            {voiceoverFile && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                <Mic className="w-4 h-4 text-muted-foreground" />
                <audio src={URL.createObjectURL(voiceoverFile)} controls className="flex-1 h-8" />
              </div>
            )}

            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <p><strong>Title:</strong> {title}</p>
              {description && <p><strong>Description:</strong> {description}</p>}
              <p><strong>Visual:</strong> {visualFile?.name}</p>
              <p><strong>Voiceover:</strong> {voiceoverFile ? voiceoverFile.name : 'None'}</p>
              <p><strong>Text:</strong> {overlayHeadline || overlayTagline ? `${overlayHeadline} / ${overlayTagline}` : 'None'}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1">← Back</Button>
              <Button onClick={handleSubmit} disabled={uploading} className="flex-1 gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Submit Ad'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
