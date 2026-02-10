import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, Save, Trash2, X,
  Image as ImageIcon, Mic, Video, FileText, UtensilsCrossed,
  Heart, Smile, Frown, Meh, TrendingUp, Play, Pause, Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JournalDayPageProps {
  userId: string;
  date: Date;
  onDateChange: (date: Date) => void;
  entry: any | null;
  onSaved: () => void;
}

const MOOD_CONFIG = {
  happy: { icon: Smile, color: 'text-yellow-500', label: 'Happy' },
  sad: { icon: Frown, color: 'text-blue-500', label: 'Sad' },
  neutral: { icon: Meh, color: 'text-muted-foreground', label: 'Neutral' },
  excited: { icon: TrendingUp, color: 'text-orange-500', label: 'Excited' },
  grateful: { icon: Heart, color: 'text-pink-500', label: 'Grateful' },
} as const;

type MoodKey = keyof typeof MOOD_CONFIG;

export default function JournalDayPage({ userId, date, onDateChange, entry, onSaved }: JournalDayPageProps) {
  // Helper to safely parse array fields that might be strings, null, or actual arrays
  const safeArray = (val: any): any[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { 
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    }
    return [];
  };

  const [content, setContent] = useState(entry?.content || '');
  const [mood, setMood] = useState<MoodKey>((entry?.mood as MoodKey) || 'neutral');
  const [tags, setTags] = useState(safeArray(entry?.tags).join(', '));
  const [gratitude, setGratitude] = useState(entry?.gratitude || '');
  const [images, setImages] = useState<string[]>(safeArray(entry?.images));
  const [voiceNotes, setVoiceNotes] = useState<string[]>(safeArray(entry?.voice_notes));
  const [videos, setVideos] = useState<string[]>(safeArray(entry?.videos));
  const [recipes, setRecipes] = useState<any[]>(safeArray(entry?.recipes));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [newRecipe, setNewRecipe] = useState({ title: '', ingredients: '', instructions: '' });

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  const yhwhDate = calculateCreatorDate(date);

  // Sync state when entry prop changes
  React.useEffect(() => {
    setContent(entry?.content || '');
    setMood((entry?.mood as MoodKey) || 'neutral');
    setTags(safeArray(entry?.tags).join(', '));
    setGratitude(entry?.gratitude || '');
    setImages(safeArray(entry?.images));
    setVoiceNotes(safeArray(entry?.voice_notes));
    setVideos(safeArray(entry?.videos));
    setRecipes(safeArray(entry?.recipes));
    setActiveSection(null);
  }, [entry, date]);

  const navigateDay = (direction: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + direction);
    onDateChange(newDate);
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `${userId}/${folder}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('journal-media')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('journal-media')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading('image');
    const newUrls: string[] = [];

    for (const file of Array.from(files)) {
      const url = await uploadFile(file, 'images');
      if (url) newUrls.push(url);
    }

    setImages(prev => [...prev, ...newUrls]);
    setUploading(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading('video');
    for (const file of Array.from(files)) {
      const url = await uploadFile(file, 'videos');
      if (url) setVideos(prev => [...prev, url]);
    }
    setUploading(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading('voice');
    for (const file of Array.from(files)) {
      const url = await uploadFile(file, 'voice-notes');
      if (url) setVoiceNotes(prev => [...prev, url]);
    }
    setUploading(null);
    if (voiceInputRef.current) voiceInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setUploading('voice');
        const url = await uploadFile(file, 'voice-notes');
        if (url) setVoiceNotes(prev => [...prev, url]);
        setUploading(null);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleAudioPlay = (url: string) => {
    if (playingAudio === url) {
      audioPlayerRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudio(null);
      audio.play();
      audioPlayerRef.current = audio;
      setPlayingAudio(url);
    }
  };

  const addRecipe = () => {
    if (!newRecipe.title.trim()) return;
    setRecipes(prev => [...prev, { ...newRecipe, id: Date.now().toString() }]);
    setNewRecipe({ title: '', ingredients: '', instructions: '' });
  };

  const removeItem = (type: string, index: number) => {
    switch (type) {
      case 'image': setImages(prev => prev.filter((_, i) => i !== index)); break;
      case 'video': setVideos(prev => prev.filter((_, i) => i !== index)); break;
      case 'voice': setVoiceNotes(prev => prev.filter((_, i) => i !== index)); break;
      case 'recipe': setRecipes(prev => prev.filter((_, i) => i !== index)); break;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const gregorianDateStr = date.toISOString().split('T')[0];
      const entryData = {
        user_id: userId,
        yhwh_year: yhwhDate.year,
        yhwh_month: yhwhDate.month,
        yhwh_day: yhwhDate.day,
        yhwh_weekday: yhwhDate.weekDay || 1,
        yhwh_day_of_year: yhwhDate.dayOfYear || 1,
        gregorian_date: gregorianDateStr,
        content,
        mood,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        gratitude: gratitude || null,
        images,
        voice_notes: voiceNotes,
        videos,
        recipes: recipes,
        part_of_yowm: 0,
        watch: 1,
        is_shabbat: yhwhDate.weekDay === 7,
        is_tequvah: false,
        feast: null,
        updated_at: new Date().toISOString(),
      };

      if (entry?.id) {
        const { error } = await supabase
          .from('journal_entries')
          .update(entryData)
          .eq('id', entry.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('journal_entries')
          .upsert(entryData, { onConflict: 'user_id,yhwh_year,yhwh_month,yhwh_day' });

        if (error) {
          // Fallback to plain insert
          const { error: insertErr } = await supabase
            .from('journal_entries')
            .insert(entryData);
          if (insertErr) throw insertErr;
        }
      }

      toast.success('Journal page saved!');
      onSaved();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isToday = date.toDateString() === new Date().toDateString();
  const hasContent = content || images.length > 0 || voiceNotes.length > 0 || videos.length > 0 || recipes.length > 0 || gratitude;

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigateDay(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div className="text-sm text-muted-foreground">
            YHWH Year {yhwhDate.year} • Month {yhwhDate.month} • Day {yhwhDate.day}
            {yhwhDate.weekDay === 7 && <Badge className="ml-2 bg-yellow-500/20 text-yellow-700 text-xs">Shabbat</Badge>}
          </div>
          {isToday && <Badge className="mt-1 bg-primary/20 text-primary text-xs">Today</Badge>}
        </div>

        <Button variant="ghost" size="icon" onClick={() => navigateDay(1)}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Journal Page Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="pt-6 space-y-5">
          {/* Mood Selector */}
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">How are you feeling?</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(MOOD_CONFIG) as [MoodKey, typeof MOOD_CONFIG[MoodKey]][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setMood(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all text-sm ${
                      mood === key
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                    <span className="text-foreground">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes / Content */}
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">
              <FileText className="h-4 w-4 inline mr-1" /> Notes
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts for this day..."
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Gratitude */}
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">
              <Heart className="h-4 w-4 inline mr-1" /> Gratitude
            </label>
            <Textarea
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              placeholder="What are you grateful for today?"
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium mb-2 block text-foreground">Tags</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="reflection, shabbat, prayer..."
            />
          </div>

          {/* Media Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploading === 'image'}>
              {uploading === 'image' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-1" />}
              Photos
            </Button>
            <Button variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} disabled={uploading === 'video'}>
              {uploading === 'video' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Video className="h-4 w-4 mr-1" />}
              Video
            </Button>
            <Button
              variant={isRecording ? 'destructive' : 'outline'}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
            >
              <Mic className={`h-4 w-4 mr-1 ${isRecording ? 'animate-pulse' : ''}`} />
              {isRecording ? 'Stop Recording' : 'Record Voice'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => voiceInputRef.current?.click()} disabled={uploading === 'voice'}>
              {uploading === 'voice' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mic className="h-4 w-4 mr-1" />}
              Upload Audio
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveSection(activeSection === 'recipe' ? null : 'recipe')}>
              <UtensilsCrossed className="h-4 w-4 mr-1" />
              Recipe
            </Button>
          </div>

          {/* Hidden file inputs */}
          <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload} />
          <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={handleVideoUpload} />
          <input ref={voiceInputRef} type="file" accept="audio/*" hidden onChange={handleVoiceUpload} />

          {/* Images Gallery */}
          {images.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                <ImageIcon className="h-4 w-4 inline mr-1" /> Photos ({images.length})
              </label>
              <div className="grid grid-cols-3 gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-lg overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeItem('image', i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                <Video className="h-4 w-4 inline mr-1" /> Videos ({videos.length})
              </label>
              <div className="space-y-2">
                {videos.map((url, i) => (
                  <div key={i} className="relative group">
                    <video src={url} controls className="w-full rounded-lg max-h-48" />
                    <button
                      onClick={() => removeItem('video', i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice Notes */}
          {voiceNotes.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                <Mic className="h-4 w-4 inline mr-1" /> Voice Notes ({voiceNotes.length})
              </label>
              <div className="space-y-2">
                {voiceNotes.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                    <Button variant="ghost" size="icon" onClick={() => toggleAudioPlay(url)} className="h-8 w-8">
                      {playingAudio === url ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <span className="text-sm text-muted-foreground flex-1">Voice Note {i + 1}</span>
                    <button onClick={() => removeItem('voice', i)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recipe Section */}
          <AnimatePresence>
            {activeSection === 'recipe' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4" /> Add Recipe
                  </h4>
                  <Input
                    value={newRecipe.title}
                    onChange={e => setNewRecipe(r => ({ ...r, title: e.target.value }))}
                    placeholder="Recipe title"
                  />
                  <Textarea
                    value={newRecipe.ingredients}
                    onChange={e => setNewRecipe(r => ({ ...r, ingredients: e.target.value }))}
                    placeholder="Ingredients (one per line)"
                    rows={3}
                  />
                  <Textarea
                    value={newRecipe.instructions}
                    onChange={e => setNewRecipe(r => ({ ...r, instructions: e.target.value }))}
                    placeholder="Instructions"
                    rows={3}
                  />
                  <Button size="sm" onClick={addRecipe} disabled={!newRecipe.title.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> Add Recipe
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved Recipes */}
          {recipes.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                <UtensilsCrossed className="h-4 w-4 inline mr-1" /> Recipes ({recipes.length})
              </label>
              <div className="space-y-2">
                {recipes.map((recipe, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 bg-muted/20">
                    <div className="flex items-start justify-between">
                      <h5 className="font-medium text-foreground">{recipe.title}</h5>
                      <button onClick={() => removeItem('recipe', i)} className="text-destructive hover:text-destructive/80">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {recipe.ingredients && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{recipe.ingredients}</p>
                    )}
                    {recipe.instructions && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{recipe.instructions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Journal Page</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
