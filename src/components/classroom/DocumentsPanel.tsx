import { useRef } from 'react';
import { Download, FileText, Image as ImageIcon, Film, Music, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LiveMediaItem } from '@/hooks/useClassroomLive';

interface Props {
  isHost: boolean;
  media: LiveMediaItem[];
  onUpload: (file: File) => void;
}

const iconFor = (mime: string | null) => {
  if (!mime) return FileText;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return Film;
  if (mime.startsWith('audio/')) return Music;
  return FileText;
};

export function DocumentsPanel({ isHost, media, onUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const docs = media.filter((m) => m.submission_role === 'host_preload');

  return (
    <div className="p-3 space-y-3">
      {isHost && (
        <>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            variant="outline"
            className="w-full border-dashed border-[#8B5CF6]/50 text-[#E8D9B5] hover:bg-[#8B5CF6]/10"
          >
            <Upload className="h-4 w-4 mr-2" /> Add document, image, video or audio
          </Button>
        </>
      )}

      {docs.length === 0 ? (
        <p className="text-[12px] italic text-[#E8D9B5]/40 text-center py-4">
          {isHost ? 'No lesson materials yet.' : 'The instructor has not shared any materials yet.'}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => {
            const Icon = iconFor(d.mime_type);
            return (
              <li key={d.id} className="flex items-center gap-2 rounded-lg bg-[#14101F] border border-[#8B5CF6]/25 px-2.5 py-2">
                <Icon className="h-4 w-4 text-[#8B5CF6] shrink-0" />
                <span className="flex-1 text-sm text-[#E8D9B5] truncate">{d.file_name}</span>
                <a href={d.file_path} target="_blank" rel="noopener noreferrer" download={d.file_name}>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[#E8D9B5] hover:bg-[#8B5CF6]/15">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
