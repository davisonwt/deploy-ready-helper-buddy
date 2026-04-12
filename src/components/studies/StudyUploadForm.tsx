import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, BookOpen, Image, FileText, Mic, Video, Gift, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface UploadedFile {
  file: File;
  type: 'document' | 'audio' | 'video';
}

const ACCEPTED_DOCS = '.pdf,.docx,.doc,.txt,.md';
const ACCEPTED_AUDIO = '.mp3,.wav,.m4a,.ogg,.aac';
const ACCEPTED_VIDEO = '.mp4,.webm,.mov';
const DEFAULT_COVER = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';

export default function StudyUploadForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentStudyId = searchParams.get('parent') || null;
  const parentTitle = searchParams.get('parentTitle') || null;

  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [bestowalValue, setBestowalValue] = useState(0);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [studyFiles, setStudyFiles] = useState<UploadedFile[]>([]);

  const isSection = !!parentStudyId;

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'audio' | 'video') => {
    const files = Array.from(e.target.files || []);
    setStudyFiles(prev => [...prev, ...files.map(file => ({ file, type }))]);
  };

  const removeFile = (index: number) => {
    setStudyFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please login first'); return; }
    if (!isSection && !title.trim()) { toast.error('Title is required'); return; }
    if (isSection && !sectionTitle.trim()) { toast.error('Section title is required'); return; }
    if (studyFiles.length === 0) { toast.error('Please add at least one file'); return; }

    setUploading(true);
    try {
      // 1. Upload main file
      const mainFile = studyFiles[0].file;
      const mainExt = mainFile.name.split('.').pop();
      const mainPath = `${user.id}/studies/${Date.now()}-main.${mainExt}`;
      const { error: mainUploadErr } = await supabase.storage
        .from('study-uploads')
        .upload(mainPath, mainFile, { contentType: mainFile.type });
      if (mainUploadErr) throw mainUploadErr;
      const { data: { publicUrl: mainUrl } } = supabase.storage
        .from('study-uploads').getPublicUrl(mainPath);

      // 2. Upload additional files
      const additionalFiles: { name: string; url: string; type: string; size: number }[] = [];
      for (let i = 1; i < studyFiles.length; i++) {
        const sf = studyFiles[i];
        const ext = sf.file.name.split('.').pop();
        const path = `${user.id}/studies/${Date.now()}-${i}.${ext}`;
        const { error } = await supabase.storage
          .from('study-uploads')
          .upload(path, sf.file, { contentType: sf.file.type });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
          .from('study-uploads').getPublicUrl(path);
        additionalFiles.push({ name: sf.file.name, url: publicUrl, type: sf.type, size: sf.file.size });
      }

      // 3. Upload cover image if provided
      let coverUrl: string | null = null;
      if (coverImage) {
        const coverExt = coverImage.name.split('.').pop();
        const coverPath = `${user.id}/studies/${Date.now()}-cover.${coverExt}`;
        const { error } = await supabase.storage
          .from('study-uploads')
          .upload(coverPath, coverImage, { contentType: coverImage.type });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
          .from('study-uploads').getPublicUrl(coverPath);
        coverUrl = publicUrl;
      }

      // 4. Get next section_order if adding a section
      let sectionOrder = 0;
      if (isSection) {
        const { data: existingSections } = await (supabase
          .from('s2g_library_items') as any)
          .select('section_order')
          .eq('parent_study_id', parentStudyId)
          .order('section_order', { ascending: false })
          .limit(1);
        sectionOrder = (existingSections?.[0]?.section_order ?? -1) + 1;
      }

      // 5. Insert into s2g_library_items
      const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      const insertData: any = {
        user_id: user.id,
        title: isSection ? (parentTitle || 'Study') : title.trim(),
        description: description.trim() || null,
        type: 'study',
        file_url: mainUrl,
        file_size: mainFile.size,
        cover_image_url: coverUrl,
        price: bestowalValue > 0 ? bestowalValue : 0,
        tags: tagsArray.length > 0 ? tagsArray : null,
        is_public: true,
        category: 'scripture',
        additional_files: additionalFiles.length > 0 ? additionalFiles : [],
      };

      if (isSection) {
        insertData.parent_study_id = parentStudyId;
        insertData.section_title = sectionTitle.trim();
        insertData.section_order = sectionOrder;
      }

      const { data: libItem, error: insertErr } = await supabase
        .from('s2g_library_items')
        .insert(insertData)
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 6. Generate cover if none provided (main studies only)
      if (!coverUrl && libItem && !isSection) {
        supabase.functions.invoke('generate-study-cover', {
          body: { title: title.trim(), description: description.trim(), study_id: libItem.id },
        }).catch(err => console.error('Cover generation failed:', err));
      }

      // 7. Auto-post to social feed (main studies only)
      if (!isSection) {
        const shortDesc = description.trim().length > 200 
          ? description.trim().slice(0, 197) + '...' 
          : description.trim() || `New study: ${title}`;
        const feedMediaUrl = coverUrl || DEFAULT_COVER;

        await supabase.from('memry_posts').insert({
          user_id: user.id,
          content_type: 'study',
          media_url: feedMediaUrl,
          caption: `📖 New Study: ${title}\n\n${shortDesc}`,
          content_category: 'scripture',
          study_id: libItem.id,
        });
      }

      toast.success(isSection ? 'Section added!' : 'Study uploaded successfully!');
      
      if (isSection && parentStudyId) {
        navigate(`/study/${parentStudyId}`);
      } else {
        navigate('/enochian-calendar-design?view=studies');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Failed to upload study');
    } finally {
      setUploading(false);
    }
  };

  const fileTypeIcon = (type: string) => {
    if (type === 'document') return <FileText className="w-4 h-4" />;
    if (type === 'audio') return <Mic className="w-4 h-4" />;
    return <Video className="w-4 h-4" />;
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {isSection ? `Add Section to: ${parentTitle}` : 'Upload a Study'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title (main study) or Section Title */}
          {isSection ? (
            <div className="space-y-1.5">
              <Label htmlFor="sectionTitle">Section Title *</Label>
              <Input id="sectionTitle" value={sectionTitle} onChange={e => setSectionTitle(e.target.value)}
                placeholder="e.g. Chapter 2 — The Remnant" required maxLength={200} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="title">Study Title *</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} 
                placeholder="e.g. Victory Already Won — Part 3" required maxLength={200} />
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What is this study about? This will appear in the social feed..." 
              rows={4} maxLength={2000} />
          </div>

          {/* Cover Image (main studies only) */}
          {!isSection && (
            <div className="space-y-1.5">
              <Label>Cover Image (optional — AI will generate one if empty)</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed cursor-pointer hover:bg-accent/50 transition-colors">
                  <Image className="w-4 h-4" />
                  <span className="text-sm">{coverImage ? coverImage.name : 'Choose image'}</span>
                  <input type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
                </label>
                {coverPreview && (
                  <img src={coverPreview} alt="Cover preview" className="w-16 h-16 rounded-lg object-cover" />
                )}
              </div>
            </div>
          )}

          {/* Study Files */}
          <div className="space-y-3">
            <Label>Study Files *</Label>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed cursor-pointer hover:bg-accent/50 transition-colors text-center">
                <FileText className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-medium">Documents</span>
                <span className="text-[10px] text-muted-foreground">PDF, DOCX, TXT</span>
                <input type="file" accept={ACCEPTED_DOCS} multiple onChange={e => handleFileAdd(e, 'document')} className="hidden" />
              </label>
              <label className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed cursor-pointer hover:bg-accent/50 transition-colors text-center">
                <Mic className="w-5 h-5 text-purple-500" />
                <span className="text-xs font-medium">Voice Notes</span>
                <span className="text-[10px] text-muted-foreground">MP3, WAV, M4A</span>
                <input type="file" accept={ACCEPTED_AUDIO} multiple onChange={e => handleFileAdd(e, 'audio')} className="hidden" />
              </label>
              <label className="flex flex-col items-center gap-1 p-3 rounded-xl border border-dashed cursor-pointer hover:bg-accent/50 transition-colors text-center">
                <Video className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium">Videos</span>
                <span className="text-[10px] text-muted-foreground">MP4, WEBM</span>
                <input type="file" accept={ACCEPTED_VIDEO} multiple onChange={e => handleFileAdd(e, 'video')} className="hidden" />
              </label>
            </div>

            {studyFiles.length > 0 && (
              <div className="space-y-1.5">
                {studyFiles.map((sf, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-accent/30 text-sm">
                    {fileTypeIcon(sf.type)}
                    <span className="flex-1 truncate">{sf.file.name}</span>
                    <span className="text-xs text-muted-foreground">{(sf.file.size / 1024 / 1024).toFixed(1)}MB</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-destructive text-xs hover:underline">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" value={tags} onChange={e => setTags(e.target.value)}
              placeholder="e.g. end times, revelation, prophecy" />
          </div>

          {/* Bestowal (main studies only) */}
          {!isSection && (
            <div className="space-y-2">
              <Label>Bestowal Value (USDC)</Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <Input type="number" min={0} step={0.01} value={bestowalValue}
                    onChange={e => setBestowalValue(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Gift className="w-3.5 h-3.5" />
                  <span>{bestowalValue <= 0 ? 'Free study — gifts welcome' : `${bestowalValue} USDC to access`}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Set to 0 for free access. Tribe members can always send free gifts regardless.
              </p>
            </div>
          )}

          <Button type="submit" disabled={uploading || (isSection ? !sectionTitle.trim() : !title.trim()) || studyFiles.length === 0} className="w-full" size="lg">
            {uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> {isSection ? 'Add Section' : 'Publish Study'}</>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
