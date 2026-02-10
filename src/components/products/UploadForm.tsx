import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle2, Disc, Music, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { WhispererSelector, PendingInvitation } from './WhispererSelector';

export default function UploadForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'music',
    category: '',
    license_type: 'free',
    price: 0,
    tags: ''
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [mainFile, setMainFile] = useState<File | null>(null);
  const [releaseType, setReleaseType] = useState<'single' | 'album'>('single');
  const [albumFiles, setAlbumFiles] = useState<File[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [extractingZip, setExtractingZip] = useState(false);
  
  // Whisperer invitation state
  const [whispererEnabled, setWhispererEnabled] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);

  const handleAddInvitation = (invitation: PendingInvitation) => {
    setPendingInvitations(prev => [...prev, invitation]);
  };

  const handleRemoveInvitation = (whispererId: string) => {
    setPendingInvitations(prev => prev.filter(inv => inv.whisperer.id !== whispererId));
  };

  const handleZipUpload = async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      toast.error('Please select a ZIP file');
      return;
    }

    setExtractingZip(true);
    setZipFile(file);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const audioFiles: File[] = [];

      // Extract only audio files
      for (const [filename, zipEntry] of Object.entries(contents.files)) {
        if (zipEntry.dir) continue;
        
        const isAudio = /\.(mp3|wav|m4a|flac|aac|ogg|wma)$/i.test(filename);
        if (!isAudio) continue;

        const blob = await zipEntry.async('blob');
        const audioFile = new File([blob], filename.split('/').pop() || filename, {
          type: blob.type || 'audio/mpeg'
        });
        
        audioFiles.push(audioFile);
      }

      if (audioFiles.length === 0) {
        toast.error('No audio files found in ZIP');
        setZipFile(null);
        return;
      }

      if (audioFiles.length < 8) {
        toast.warning(`Only ${audioFiles.length} tracks found. Albums typically have 8+ songs.`);
      }

      setAlbumFiles(audioFiles);
      toast.success(`Extracted ${audioFiles.length} audio files from ZIP`);
    } catch (error) {
      console.error('ZIP extraction error:', error);
      toast.error('Failed to extract ZIP file');
      setZipFile(null);
    } finally {
      setExtractingZip(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to upload');
      return;
    }

    const isAlbum = formData.type === 'music' && releaseType === 'album';
    if (!coverImage || (isAlbum ? albumFiles.length === 0 : !mainFile)) {
      toast.error(isAlbum ? 'Please select a cover and at least one audio file for the album' : 'Please select both cover image and main file');
      return;
    }

    if (isAlbum && albumFiles.length < 8) {
      toast.error('Albums must have at least 8 tracks. Use single track upload for shorter releases.');
      return;
    }

    // Check file size limits (Supabase object limit ~50MB per file)
    const perFileLimit = 50 * 1024 * 1024; // 50MB

    if (isAlbum) {
      const tooLarge = albumFiles.find((f) => f.size > perFileLimit);
      if (tooLarge) {
        toast.error(`Track "${tooLarge.name}" is ${(tooLarge.size / 1024 / 1024).toFixed(2)}MB and exceeds the 50MB per-file limit.`);
        return;
      }
    } else if (mainFile && mainFile.size > perFileLimit) {
      toast.error(`File size (${(mainFile.size / 1024 / 1024).toFixed(2)}MB) exceeds the 50MB limit.`);
      return;
    }

    if (coverImage.size > 10 * 1024 * 1024) {
      toast.error('Cover image must be under 10MB');
      return;
    }

    setUploading(true);

    try {
      // Get or create sower profile
      const { data: sowerData, error: sowerError } = await supabase
        .from('sowers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let sowerId = sowerData?.id;

      if (!sowerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();

        const { data: newSower, error: createError } = await supabase
          .from('sowers')
          .insert({
            user_id: user.id,
            display_name: profile?.display_name || user.email?.split('@')[0] || 'Anonymous'
          })
          .select()
          .single();

        if (createError) throw createError;
        sowerId = newSower.id;
      }

      // Upload cover image - ensure file is valid before upload
      if (!coverImage || coverImage.size === 0) {
        throw new Error('Cover image is empty or invalid');
      }
      
      console.log('📤 Uploading cover image:', { name: coverImage.name, size: coverImage.size, type: coverImage.type });
      const coverExt = coverImage.name.split('.').pop();
      const coverPath = `covers/${user.id}/${Date.now()}.${coverExt}`;
      const { error: coverUploadError } = await supabase.storage
        .from('premium-room')
        .upload(coverPath, coverImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (coverUploadError) {
        console.error('Cover upload error:', coverUploadError);
        throw coverUploadError;
      }

      const { data: coverUrl } = supabase.storage
        .from('premium-room')
        .getPublicUrl(coverPath);

      // Prepare main upload (single file or album manifest)
      let fileUrlPublic = '';

      if (isAlbum) {
        // Upload each track separately to avoid per-object 50MB limit
        const timestamp = Date.now();
        const baseDir = `products/${user.id}/${timestamp}`;
        const trackResults: { name: string; size: number; path: string; url: string }[] = [];
        const sanitizeFileName = (name: string) =>
          name
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '') // strip diacritics
            .replace(/\s+/g, '_')
            .replace(/[^A-Za-z0-9._-]/g, '_')
            .slice(0, 200);

        for (const f of albumFiles) {
          // Validate file before upload
          if (!f || f.size === 0) {
            console.error('Invalid file in album:', f?.name);
            throw new Error(`File "${f?.name}" is empty or invalid`);
          }
          
          console.log('📤 Uploading track:', { name: f.name, size: f.size, type: f.type });
          const ext = f.name.includes('.') ? f.name.split('.').pop() : undefined;
          const baseName = f.name.replace(/\.[^.]+$/, '');
          const safeName = `${sanitizeFileName(baseName)}${ext ? '.' + sanitizeFileName(ext) : ''}`;
          const trackPath = `${baseDir}/${safeName}`;
          const { error: trackErr } = await supabase.storage
            .from('premium-room')
            .upload(trackPath, f, {
              cacheControl: '3600',
              upsert: false
            });
          if (trackErr) {
            console.error('Track upload error:', trackErr);
            throw trackErr;
          }
          const { data: trackUrl } = supabase.storage
            .from('premium-room')
            .getPublicUrl(trackPath);
          trackResults.push({ name: f.name, size: f.size, path: trackPath, url: trackUrl.publicUrl });
        }

        // Create and upload manifest
        const manifestBlob = new Blob([
          JSON.stringify({
            type: 'album',
            createdAt: new Date().toISOString(),
            cover: coverUrl.publicUrl,
            tracks: trackResults
          }, null, 2)
        ], { type: 'application/json' });
        const manifestPath = `${baseDir}/manifest.json`;
        const { error: manifestErr } = await supabase.storage
          .from('premium-room')
          .upload(manifestPath, manifestBlob, { contentType: 'application/json' });
        if (manifestErr) throw manifestErr;
        const { data: manifestUrl } = supabase.storage
          .from('premium-room')
          .getPublicUrl(manifestPath);
        fileUrlPublic = manifestUrl.publicUrl;
      } else {
        // Single file upload - validate file before upload
        if (!mainFile || mainFile.size === 0) {
          throw new Error('Main file is empty or invalid');
        }
        
        console.log('📤 Uploading main file:', { name: mainFile.name, size: mainFile.size, type: mainFile.type });
        const uploadBlob = mainFile as File;
        const uploadExt = (mainFile as File).name.split('.').pop() || 'bin';
        const filePath = `products/${user.id}/${Date.now()}.${uploadExt}`;
        const { error: fileUploadError } = await supabase.storage
          .from('premium-room')
          .upload(filePath, uploadBlob, {
            cacheControl: '3600',
            upsert: false
          });
        if (fileUploadError) {
          console.error('File upload error:', fileUploadError);
          throw fileUploadError;
        }
        const { data: fileUrl } = supabase.storage
          .from('premium-room')
          .getPublicUrl(filePath);
        fileUrlPublic = fileUrl.publicUrl;
      }


      // Calculate total price with fees (10% tithing + 5% admin)
      const basePrice = parseFloat(String(formData.price)) || 0;
      const totalPrice = basePrice * 1.15; // Add 15% (10% + 5%)

      // Create product with whisperer settings
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          sower_id: sowerId,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          category: formData.category,
          license_type: formData.license_type,
          price: totalPrice, // Store total price
          cover_image_url: coverUrl.publicUrl,
          file_url: fileUrlPublic,
          tags: [...formData.tags.split(',').map(t => t.trim()).filter(Boolean), releaseType],
          has_whisperer: whispererEnabled && pendingInvitations.length > 0,
          whisperer_commission_percent: null, // Will be set per-whisperer after they accept
        })
        .select()
        .single();

      if (productError) throw productError;
      
      // Create whisperer invitations if enabled
      if (whispererEnabled && pendingInvitations.length > 0 && newProduct) {
        for (const inv of pendingInvitations) {
          const { error: invitationError } = await supabase
            .from('whisperer_invitations')
            .insert({
              product_id: newProduct.id,
              sower_id: user.id,
              whisperer_id: inv.whisperer.id,
              proposed_commission_percent: inv.commissionPercent,
              message: inv.message || null,
              status: 'pending',
            });
          
          if (invitationError) {
            console.error('Whisperer invitation error:', invitationError);
            // Don't fail the upload, just log it
          }
        }
        toast.success(`Sent ${pendingInvitations.length} whisperer invitation(s)`);
      }

      // Award XP for uploading product (100 XP) - use type assertion for RPC
      if (user) {
        try {
          await (supabase.rpc as any)('add_xp_to_current_user', { amount: 100 });
        } catch (err) {
          console.warn('XP award not available:', err);
        }
      }

      toast.success('Product uploaded successfully!');
      navigate('/my-products');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Upload New Seed</CardTitle>
          <CardDescription>Share your seeds with the S2G community — music, books, art, produce & more</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select value={formData.type} onValueChange={(value) => {
                    console.log('Product type changed to:', value);
                    setFormData({ ...formData, type: value });
                    // Clear files when switching away from music to ensure proper file filtering
                    if (value !== 'music') {
                      setMainFile(null);
                      setAlbumFiles([]);
                      setZipFile(null);
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="ebook">E-Book</SelectItem>
                      <SelectItem value="book">Book (Physical)</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                      <SelectItem value="produce">Produce</SelectItem>
                      <SelectItem value="file">File / Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === 'music' && (
                  <div>
                    <Label htmlFor="releaseType">Release Type *</Label>
                    <Select value={releaseType} onValueChange={(value) => {
                      setReleaseType(value as 'single' | 'album');
                      setMainFile(null);
                      setAlbumFiles([]);
                      setZipFile(null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Single or Album" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Track</SelectItem>
                        <SelectItem value="album">Album (8+ Tracks)</SelectItem>
                      </SelectContent>
                    </Select>
                    {releaseType === 'album' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Albums must have 8+ songs. Upload as ZIP or select multiple files.
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder={
                      formData.type === 'music' ? 'e.g., gospel, worship, instrumental' :
                      formData.type === 'ebook' ? 'e.g., devotional, study guide, fiction' :
                      formData.type === 'book' ? 'e.g., teaching, biography, children' :
                      formData.type === 'art' ? 'e.g., painting, photography, digital art' :
                      formData.type === 'produce' ? 'e.g., vegetables, fruit, herbs' :
                      'e.g., education, entertainment'
                    }
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="license">License Type *</Label>
                  <Select value={formData.license_type} onValueChange={(value) => setFormData({ ...formData, license_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="bestowal">Bestowal Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.license_type === 'bestowal' && (
                  <div>
                    <Label htmlFor="price">Base Price (USDC) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Total charged: ${((formData.price || 0) * 1.15).toFixed(2)} USDC (includes 10% tithing + 5% admin fee)
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cover">Cover Image *</Label>
                  <div className="mt-2">
                    <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {coverImage ? coverImage.name : 'Click to upload cover'}
                        </p>
                      </div>
                      <input
                        id="cover"
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) {
                            console.error('No cover image selected');
                            return;
                          }
                          
                          const file = files[0];
                          if (!file) {
                            console.error('No file in files array');
                            return;
                          }
                          
                          if (file.size === 0) {
                            console.error('Empty cover image detected:', file.name);
                            toast.error(`Cover image "${file.name}" is empty. Please select a valid image file.`);
                            // Reset input
                            e.target.value = '';
                            return;
                          }
                          
                          console.log('Cover image selected:', { name: file.name, size: file.size, type: file.type });
                          // Store file immediately
                          setCoverImage(file);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="file">
                    {formData.type === 'music' && releaseType === 'album' 
                      ? 'Album Tracks *' 
                      : formData.type === 'ebook' ? 'E-Book File (PDF, EPUB) *'
                      : formData.type === 'book' ? 'Book Preview / Sample (PDF) *'
                      : formData.type === 'produce' ? 'Product Photo *'
                      : formData.type === 'art' ? 'Art File (Image, PDF) *'
                      : 'Main File *'}
                  </Label>
                  <div className="mt-2 space-y-2">
                    {formData.type === 'music' && releaseType === 'album' && (
                      <>
                        <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                          <div className="text-center">
                            <Disc className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground font-medium">
                              {zipFile ? zipFile.name : 'Upload ZIP Archive'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Recommended for 50MB+ albums
                            </p>
                          </div>
                          <input
                            id="zip-file"
                            type="file"
                            className="hidden"
                            disabled={extractingZip || albumFiles.length > 0}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleZipUpload(file);
                            }}
                          />
                        </label>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">or</span>
                          </div>
                        </div>
                      </>
                    )}
                    <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <div className="text-center">
                        {extractingZip ? (
                          <>
                            <Loader2 className="w-6 h-6 mx-auto mb-2 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground">Extracting ZIP...</p>
                          </>
                        ) : (
                          <>
                            <Music className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                            {formData.type === 'music' && releaseType === 'album' ? (
                              <p className="text-sm text-muted-foreground">
                                {albumFiles.length > 0 ? `${albumFiles.length} files selected` : 'Select Multiple Audio Files'}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                {mainFile ? mainFile.name : 'Click to upload file'}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      <input
                        id="file"
                        type="file"
                        className="hidden"
                        multiple={formData.type === 'music' && releaseType === 'album'}
                        disabled={extractingZip || (formData.type === 'music' && releaseType === 'album' && zipFile !== null)}
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) {
                            console.error('No files selected');
                            return;
                          }
                          
                          // Immediately capture files before any async operations
                          const fileList = Array.from(files);
                          
                          if (formData.type === 'music' && releaseType === 'album') {
                            // Validate and store files immediately
                            const validFiles = fileList.filter(file => {
                              if (!file) {
                                console.error('Null file in array');
                                return false;
                              }
                              if (file.size === 0) {
                                console.error('Empty file detected:', file.name);
                                toast.error(`File "${file.name}" is empty. Please select a valid file.`);
                                return false;
                              }
                              console.log('Valid file:', { name: file.name, size: file.size, type: file.type });
                              return true;
                            });
                            
                            if (validFiles.length > 0) {
                              // Store files immediately - don't wait for any async operations
                              setAlbumFiles([...validFiles]); // Create new array to ensure React detects change
                              setMainFile(null);
                              setZipFile(null);
                            }
                          } else {
                            const file = fileList[0];
                            if (!file) {
                              console.error('No file selected');
                              return;
                            }
                            
                            if (file.size === 0) {
                              console.error('Empty file detected:', file.name);
                              toast.error(`File "${file.name}" is empty. Please select a valid file.`);
                              // Reset input
                              e.target.value = '';
                              return;
                            }
                            
                            console.log('File selected:', { name: file.name, size: file.size, type: file.type });
                            // Store file immediately
                            setMainFile(file);
                            setAlbumFiles([]);
                          }
                        }}
                      />
                    </label>
                    {formData.type === 'music' && releaseType === 'album' && albumFiles.length > 0 && (
                      <>
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium flex items-center gap-2">
                              {zipFile && <Disc className="w-4 h-4" />}
                              {albumFiles.length} Tracks
                            </span>
                            <span className="text-sm font-bold">
                              {(albumFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB total
                            </span>
                          </div>
                          {albumFiles.length < 8 && (
                            <p className="text-xs text-warning mb-2">⚠️ Albums require 8+ tracks</p>
                          )}
                          <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                albumFiles.length < 8 ? 'bg-warning' : 'bg-primary'
                              }`}
                              style={{ 
                                width: `${Math.min((albumFiles.length / 8) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </div>
                        <ul className="mt-2 max-h-32 overflow-y-auto text-sm space-y-1">
                          {albumFiles.map((f, i) => (
                            <li key={i} className="flex items-center justify-between gap-2 p-2 bg-background rounded hover:bg-muted/50 transition-colors">
                              <span className="truncate text-muted-foreground flex-1">{f.name}</span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAlbumFiles(albumFiles.filter((_, index) => index !== i));
                                  if (albumFiles.length === 1) setZipFile(null);
                                }}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1 hover:bg-destructive/10 rounded"
                              >
                                <X size={16} />
                              </button>
                            </li>
                          ))}
                        </ul>
                        {zipFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => {
                              setZipFile(null);
                              setAlbumFiles([]);
                            }}
                          >
                            Clear All & Start Over
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    placeholder={
                      formData.type === 'music' ? 'music, relaxing, ambient' :
                      formData.type === 'ebook' ? 'ebook, devotional, study' :
                      formData.type === 'book' ? 'book, teaching, inspirational' :
                      formData.type === 'art' ? 'art, painting, digital' :
                      formData.type === 'produce' ? 'organic, fresh, homegrown' :
                      'document, resource, guide'
                    }
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Whisperer Section */}
            <WhispererSelector
              enabled={whispererEnabled}
              onEnabledChange={setWhispererEnabled}
              pendingInvitations={pendingInvitations}
              onAddInvitation={handleAddInvitation}
              onRemoveInvitation={handleRemoveInvitation}
              maxWhisperers={3}
            />

            <Button type="submit" disabled={uploading} className="w-full" size="lg">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Upload Seed
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
