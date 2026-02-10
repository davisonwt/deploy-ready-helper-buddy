import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Calendar as CalendarIcon, 
  Search, 
  Filter,
  Plus,
  Download,
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  UtensilsCrossed,
  Heart,
  Smile,
  Frown,
  Meh,
  TrendingUp,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getCreatorTime } from '@/utils/customTime';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import CalendarGrid from './CalendarGrid';
import JournalDayPage from './JournalDayPage';

export interface JournalEntry {
  id: string;
  yhwhDate: {
    year: number;
    month: number;
    day: number;
    weekDay: number;
  };
  gregorianDate: string;
  content: string;
  mood?: 'happy' | 'sad' | 'neutral' | 'excited' | 'grateful';
  tags?: string[];
  images?: string[];
  createdAt: string;
  updatedAt: string;
  partOfYowm?: number;
  watch?: number;
  feast?: string;
  isShabbat?: boolean;
  isTequvah?: boolean;
}

const MOOD_ICONS = {
  happy: Smile,
  sad: Frown,
  neutral: Meh,
  excited: TrendingUp,
  grateful: Heart,
};

const MOOD_COLORS = {
  happy: 'text-yellow-500',
  sad: 'text-blue-500',
  neutral: 'text-muted-foreground',
  excited: 'text-orange-500',
  grateful: 'text-pink-500',
};

export default function Journal() {
  const { location } = useUserLocation();
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [rawEntries, setRawEntries] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [migrated, setMigrated] = useState(false);
  const [activeTab, setActiveTab] = useState('today');

  // Load entries from Supabase
  const loadEntries = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRawEntries(data || []);

      const formattedEntries: JournalEntry[] = (data || []).map((entry: any) => ({
        id: entry.id,
        yhwhDate: {
          year: entry.yhwh_year,
          month: entry.yhwh_month,
          day: entry.yhwh_day,
          weekDay: entry.yhwh_weekday,
        },
        gregorianDate: new Date(entry.gregorian_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        content: entry.content,
        mood: entry.mood,
        tags: entry.tags || [],
        images: entry.images || [],
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
        partOfYowm: entry.part_of_yowm,
        watch: entry.watch,
        isShabbat: entry.is_shabbat,
        isTequvah: entry.is_tequvah,
        feast: entry.feast,
      }));

      setEntries(formattedEntries);

      // Migrate localStorage entries (one-time)
      if (!migrated) {
        await migrateLocalStorageEntries(user.id);
        setMigrated(true);
      }
    } catch (error) {
      console.error('Failed to load journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('journal_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_entries',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadEntries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Migrate localStorage entries to Supabase
  const migrateLocalStorageEntries = async (userId: string) => {
    try {
      const stored = localStorage.getItem('yhwh-journal-entries');
      if (!stored) return;

      const localEntries: JournalEntry[] = JSON.parse(stored);
      
      for (const entry of localEntries) {
        const { data: existing } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('user_id', userId)
          .eq('yhwh_year', entry.yhwhDate.year)
          .eq('yhwh_month', entry.yhwhDate.month)
          .eq('yhwh_day', entry.yhwhDate.day)
          .maybeSingle();

        if (!existing) {
          await supabase.from('journal_entries').insert({
            user_id: userId,
            yhwh_year: entry.yhwhDate.year,
            yhwh_month: entry.yhwhDate.month,
            yhwh_day: entry.yhwhDate.day,
            yhwh_weekday: entry.yhwhDate.weekDay || 1,
            yhwh_day_of_year: calculateCreatorDate(new Date(entry.createdAt)).dayOfYear || 1,
            gregorian_date: new Date(entry.createdAt).toISOString().split('T')[0],
            content: entry.content,
            mood: entry.mood,
            tags: entry.tags || [],
            images: entry.images || [],
            part_of_yowm: entry.partOfYowm || 0,
            watch: entry.watch || 1,
            is_shabbat: entry.isShabbat || false,
            is_tequvah: entry.isTequvah || false,
            feast: entry.feast,
          });
        }
      }

      localStorage.removeItem('yhwh-journal-entries');
    } catch (error) {
      console.error('Failed to migrate localStorage entries:', error);
    }
  };

  // Find raw entry for the selected date
  const currentDayEntry = useMemo(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    return rawEntries.find(e => e.gregorian_date === dateStr) || null;
  }, [rawEntries, selectedDate]);

  // Filtered entries for list view
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = !searchQuery || 
        entry.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesMood = moodFilter === 'all' || entry.mood === moodFilter;
      return matchesSearch && matchesMood;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [entries, searchQuery, moodFilter]);

  // Export entries
  const handleExport = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yhwh-journal-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        const { error } = await supabase
          .from('journal_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } catch (error) {
        console.error('Failed to delete entry:', error);
        alert('Failed to delete entry. Please try again.');
      }
    }
  };

  // Content type indicators for list entries
  const getEntryMediaBadges = (entry: any) => {
    const raw = rawEntries.find(r => r.id === entry.id);
    if (!raw) return null;
    const badges = [];
    if (raw.images?.length > 0) badges.push({ icon: ImageIcon, label: `${raw.images.length} photo${raw.images.length > 1 ? 's' : ''}` });
    if (raw.videos?.length > 0) badges.push({ icon: Video, label: `${raw.videos.length} video${raw.videos.length > 1 ? 's' : ''}` });
    if (raw.voice_notes?.length > 0) badges.push({ icon: Mic, label: `${raw.voice_notes.length} voice note${raw.voice_notes.length > 1 ? 's' : ''}` });
    const recipes = typeof raw.recipes === 'string' ? JSON.parse(raw.recipes || '[]') : (raw.recipes || []);
    if (recipes.length > 0) badges.push({ icon: UtensilsCrossed, label: `${recipes.length} recipe${recipes.length > 1 ? 's' : ''}` });
    return badges;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            My Journal
          </h2>
          <p className="text-muted-foreground mt-2">
            Reflect on your journey through the YHWH calendar
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="gap-4">
          <TabsTrigger value="today">
            <Plus className="h-4 w-4 mr-2" />
            Today's Page
          </TabsTrigger>
          <TabsTrigger value="entries">
            <FileText className="h-4 w-4 mr-2" />
            All Entries
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* Today's Page / Day View */}
        <TabsContent value="today">
          {user ? (
            <JournalDayPage
              userId={user.id}
              date={selectedDate}
              onDateChange={setSelectedDate}
              entry={currentDayEntry}
              onSaved={loadEntries}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Please sign in to use the journal.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Entries List */}
        <TabsContent value="entries" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={moodFilter}
                  onChange={(e) => setMoodFilter(e.target.value)}
                  className="px-4 py-2 border rounded-lg bg-card text-foreground"
                >
                  <option value="all">All Moods</option>
                  <option value="happy">Happy</option>
                  <option value="sad">Sad</option>
                  <option value="neutral">Neutral</option>
                  <option value="excited">Excited</option>
                  <option value="grateful">Grateful</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Entries */}
          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || moodFilter !== 'all' 
                      ? 'No entries match your filters'
                      : 'No entries yet. Go to "Today\'s Page" to start!'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredEntries.map((entry) => {
                const mediaBadges = getEntryMediaBadges(entry);
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedDate(new Date(entry.createdAt));
                        setActiveTab('today');
                      }}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="secondary">
                                Year {entry.yhwhDate.year}, Month {entry.yhwhDate.month}, Day {entry.yhwhDate.day}
                              </Badge>
                              {entry.yhwhDate.weekDay === 7 && (
                                <Badge className="bg-yellow-500/20 text-yellow-700">Shabbat</Badge>
                              )}
                              {entry.mood && (
                                <span className={MOOD_COLORS[entry.mood]}>
                                  {React.createElement(MOOD_ICONS[entry.mood], { className: 'h-4 w-4' })}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{entry.gregorianDate}</div>
                          </div>
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {entry.content && (
                          <p className="text-foreground line-clamp-3 mb-2">{entry.content}</p>
                        )}

                        {/* Media indicators */}
                        {mediaBadges && mediaBadges.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {mediaBadges.map((b, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                <b.icon className="h-3 w-3 mr-1" />
                                {b.label}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar">
          <CalendarGrid 
            entries={entries}
            onDateSelect={(date) => {
              setSelectedDate(date);
              setActiveTab('today');
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
