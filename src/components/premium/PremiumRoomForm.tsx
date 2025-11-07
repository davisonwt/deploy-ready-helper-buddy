import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Image, Music, X } from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  price: number;
}

interface FormData {
  title: string;
  description: string;
  roomType: string;
  maxParticipants: number;
  documents: FileItem[];
  artwork: FileItem[];
  music: FileItem[];
  isPublic: boolean;
  price: number;
}

export const PremiumRoomForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    roomType: 'classroom',
    maxParticipants: 50,
    documents: [],
    artwork: [],
    music: [],
    isPublic: true,
    price: 0
  });

  const [loading, setLoading] = useState(false);

  const createPremiumRoom = async (roomData: FormData) => {
    const { data, error } = await supabase
      .from('premium_rooms')
      .insert([{
        title: roomData.title,
        description: roomData.description,
        room_type: roomData.roomType,
        max_participants: roomData.maxParticipants,
        is_public: roomData.isPublic,
        price: roomData.price,
        documents: roomData.documents as any,
        artwork: roomData.artwork as any,
        music: roomData.music as any,
        creator_id: user?.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const updateFilePrice = (type: keyof Pick<FormData, 'documents' | 'artwork' | 'music'>, fileId: string, price: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].map(file => 
        file.id === fileId ? { ...file, price } : file
      )
    }));
  };

  const removeFile = (type: keyof Pick<FormData, 'documents' | 'artwork' | 'music'>, fileId: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(file => file.id !== fileId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const room = await createPremiumRoom(formData);
      toast({
        title: "Success!",
        description: "Premium room created successfully",
      });
      navigate(`/premium-rooms`);
    } catch (error) {
      console.error('Room creation failed:', error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (type: keyof Pick<FormData, 'documents' | 'artwork' | 'music'>, files: FileList | null) => {
    if (!files) return;

    const uploadedFiles = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file),
      price: 0
    }));

    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], ...uploadedFiles]
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Premium Room</CardTitle>
          <CardDescription>Set up a new classroom or course with premium content</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Room Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Enter room title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe your premium room"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Room Access Price (USDC)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Set to 0 for free access</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({...formData, maxParticipants: parseInt(e.target.value) || 50})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FileUploadSection
                title="Documents"
                icon={<FileText className="h-5 w-5" />}
                files={formData.documents}
                onUpload={(files) => handleFileUpload('documents', files)}
                onPriceChange={(id, price) => updateFilePrice('documents', id, price)}
                onRemove={(id) => removeFile('documents', id)}
                accept=".pdf,.doc,.docx,.txt"
              />
              
              <FileUploadSection
                title="Artwork"
                icon={<Image className="h-5 w-5" />}
                files={formData.artwork}
                onUpload={(files) => handleFileUpload('artwork', files)}
                onPriceChange={(id, price) => updateFilePrice('artwork', id, price)}
                onRemove={(id) => removeFile('artwork', id)}
                accept="image/*"
              />
              
              <FileUploadSection
                title="Music"
                icon={<Music className="h-5 w-5" />}
                files={formData.music}
                onUpload={(files) => handleFileUpload('music', files)}
                onPriceChange={(id, price) => updateFilePrice('music', id, price)}
                onRemove={(id) => removeFile('music', id)}
                accept="audio/*"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Creating Room...' : 'Create Premium Room'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

interface FileUploadSectionProps {
  title: string;
  icon: React.ReactNode;
  files: FileItem[];
  onUpload: (files: FileList | null) => void;
  onPriceChange: (id: string, price: number) => void;
  onRemove: (id: string) => void;
  accept?: string;
}

const FileUploadSection = ({ 
  title, 
  icon, 
  files, 
  onUpload, 
  onPriceChange, 
  onRemove,
  accept 
}: FileUploadSectionProps) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="relative">
        <Input
          type="file"
          multiple
          accept={accept}
          onChange={(e) => onUpload(e.target.files)}
          className="cursor-pointer"
        />
        <Upload className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
      
      <div className="space-y-2">
        {files.map(file => (
          <div key={file.id} className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <span className="text-xs truncate flex-1">{file.name}</span>
            <Input
              type="number"
              placeholder="$0"
              className="w-16 h-7 text-xs"
              min="0"
              step="0.01"
              onChange={(e) => onPriceChange(file.id, parseFloat(e.target.value) || 0)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onRemove(file.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);
