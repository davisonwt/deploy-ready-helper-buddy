import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { BookOpen, Download, FileText, Mic, Video, Gift, Coins, Loader2, ArrowLeft, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_COVER = '/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png';

export default function StudyViewerPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: study, isLoading } = useQuery({
    queryKey: ['study', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch sections (sub-studies) for this parent
  const { data: sections = [] } = useQuery({
    queryKey: ['study-sections', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('parent_study_id' as any, id!)
        .order('section_order' as any, { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch sower profile
  const { data: sower } = useQuery({
    queryKey: ['sower-profile', study?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, user_id')
        .eq('user_id', study!.user_id)
        .single();
      return data;
    },
    enabled: !!study?.user_id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!study) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold mb-2">Study Not Found</h1>
          <Link to="/enochian-calendar-design?view=studies">
            <Button variant="outline">Back to Studies</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const coverImage = study.cover_image_url || DEFAULT_COVER;
  const additionalFiles = (study as any).additional_files || [];
  const isOwner = user?.id === study.user_id;
  const fileUrl = study.file_url;
  const fileExt = fileUrl?.split('.').pop()?.toLowerCase() || '';
  const isPdf = fileExt === 'pdf';
  const isAudio = ['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(fileExt);
  const isVideo = ['mp4', 'webm', 'mov'].includes(fileExt);

  const fileIcon = (type: string) => {
    if (type === 'audio') return <Mic className="w-4 h-4" />;
    if (type === 'video') return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Back */}
        <Link to="/enochian-calendar-design?view=studies" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Studies
        </Link>

        {/* Cover */}
        <div className="rounded-2xl overflow-hidden mb-6">
          <img src={coverImage} alt={study.title} className="w-full h-48 sm:h-64 object-cover" />
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            {(study as any).study_number && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                Study #{(study as any).study_number}
              </span>
            )}
            {(study.price ?? 0) <= 0 && (
              <span className="text-xs font-medium text-emerald-500">✨ Free</span>
            )}
          </div>
          <h1 className="text-2xl font-black text-foreground">{study.title}</h1>
          {sower && (
            <p className="text-sm text-muted-foreground mt-1">
              By {sower.display_name || 'Anonymous Sower'}
            </p>
          )}
          {study.description && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{study.description}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(study.price ?? 0) > 0 && (
            <Button className="gap-1.5">
              <Coins className="w-4 h-4" /> Bestow {study.price} USDC
            </Button>
          )}
          <Button variant="outline" className="gap-1.5">
            <Gift className="w-4 h-4" /> Gift Sower
          </Button>
        </div>

        {/* Main File Viewer */}
        <div className="rounded-2xl border overflow-hidden mb-6 bg-card">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Main Content</span>
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
                <Button size="sm" variant="ghost" className="gap-1 text-xs">
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </a>
            )}
          </div>
          <div className="p-0">
            {isPdf && fileUrl ? (
              <iframe src={fileUrl} className="w-full h-[70vh] border-0" title={study.title} />
            ) : isAudio && fileUrl ? (
              <div className="p-6">
                <audio controls className="w-full" src={fileUrl} />
              </div>
            ) : isVideo && fileUrl ? (
              <video controls className="w-full max-h-[70vh]" src={fileUrl} />
            ) : fileUrl ? (
              <div className="p-6 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">This file type cannot be previewed in the browser.</p>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
                  <Button>
                    <Download className="w-4 h-4 mr-2" /> Download File
                  </Button>
                </a>
              </div>
            ) : null}
          </div>
        </div>

        {/* Additional Files */}
        {additionalFiles.length > 0 && (
          <div className="rounded-2xl border p-4 mb-6 bg-card">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Additional Files</h3>
            <div className="space-y-2">
              {additionalFiles.map((f: any, i: number) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" download
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors">
                  {fileIcon(f.type)}
                  <span className="flex-1 text-sm truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{((f.size || 0) / 1024 / 1024).toFixed(1)}MB</span>
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        {sections.length > 0 && (
          <div className="rounded-2xl border p-4 mb-6 bg-card">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Study Sections</h3>
            <div className="space-y-2">
              {sections.map((section: any, i: number) => (
                <Link key={section.id} to={`/study/${section.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors border">
                  <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{(section as any).section_title || section.title}</p>
                    {section.description && <p className="text-xs text-muted-foreground truncate">{section.description}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Add Section (owner only) */}
        {isOwner && !(study as any).parent_study_id && (
          <Link to={`/upload-study?parent=${study.id}&parentTitle=${encodeURIComponent(study.title)}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground transition-colors mb-6">
            <Plus className="w-4 h-4" /> Add Section to This Study
          </Link>
        )}

        {/* Tags */}
        {study.tags && (study.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(study.tags as string[]).map((tag, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-accent/50 text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
