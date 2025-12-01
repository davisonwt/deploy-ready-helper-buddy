import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Calendar as CalendarIcon, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Heart,
  Smile,
  Frown,
  Meh,
  TrendingUp,
  FileText,
  Image as ImageIcon,
  Mic,
  Download
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { getCreatorTime } from '@/utils/customTime';
import { useUserLocation } from '@/hooks/useUserLocation';
import CalendarGrid from './CalendarGrid';

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
  neutral: 'text-gray-500',
  excited: 'text-orange-500',
  grateful: 'text-pink-500',
};

export default function Journal() {
  const { location } = useUserLocation();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood']>('neutral');
  const [tags, setTags] = useState<string>('');

  // Load entries from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('yhwh-journal-entries');
    if (stored) {
      try {
        setEntries(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load journal entries:', e);
      }
    }
  }, []);

  // Save entries to localStorage
  const saveEntries = (newEntries: JournalEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('yhwh-journal-entries', JSON.stringify(newEntries));
  };

  // Get current YHWH date
  const currentYhwhDate = useMemo(() => {
    return calculateCreatorDate(selectedDate);
  }, [selectedDate]);

  const currentTime = useMemo(() => {
    return getCreatorTime(selectedDate, location?.lat, location?.lon);
  }, [selectedDate, location]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = !searchQuery || 
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesMood = moodFilter === 'all' || entry.mood === moodFilter;
      return matchesSearch && matchesMood;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [entries, searchQuery, moodFilter]);

  // Create or update entry
  const handleSave = () => {
    const yhwhDate = calculateCreatorDate(selectedDate);
    const time = getCreatorTime(selectedDate, location?.lat, location?.lon);
    const gregorianDate = selectedDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const entryData: JournalEntry = {
      id: selectedEntry?.id || `entry-${Date.now()}`,
      yhwhDate,
      gregorianDate,
      content,
      mood,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: selectedEntry?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      partOfYowm: time.part,
      watch: Math.floor(time.part / 4.5) + 1,
    };

    if (selectedEntry) {
      // Update existing entry
      const updated = entries.map(e => e.id === selectedEntry.id ? entryData : e);
      saveEntries(updated);
    } else {
      // Create new entry
      saveEntries([...entries, entryData]);
    }

    // Reset form
    setSelectedEntry(null);
    setIsEditing(false);
    setContent('');
    setMood('neutral');
    setTags('');
    setSelectedDate(new Date());
  };

  // Delete entry
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      saveEntries(entries.filter(e => e.id !== id));
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
        setIsEditing(false);
      }
    }
  };

  // Start editing
  const handleEdit = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsEditing(true);
    setContent(entry.content);
    setMood(entry.mood || 'neutral');
    setTags(entry.tags?.join(', ') || '');
    setSelectedDate(new Date(entry.createdAt));
  };

  // Start new entry
  const handleNewEntry = () => {
    setSelectedEntry(null);
    setIsEditing(true);
    setContent('');
    setMood('neutral');
    setTags('');
    setSelectedDate(new Date());
  };

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
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleNewEntry} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <Tabs defaultValue="entries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entries">
            <FileText className="h-4 w-4 mr-2" />
            Entries
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
        </TabsList>

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
                <div className="flex gap-2">
                  <select
                    value={moodFilter}
                    onChange={(e) => setMoodFilter(e.target.value)}
                    className="px-4 py-2 border rounded-lg bg-card"
                  >
                    <option value="all">All Moods</option>
                    <option value="happy">Happy</option>
                    <option value="sad">Sad</option>
                    <option value="neutral">Neutral</option>
                    <option value="excited">Excited</option>
                    <option value="grateful">Grateful</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entry Form */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedEntry ? 'Edit Entry' : 'New Entry'}</span>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedEntry(null);
                        setContent('');
                        setMood('neutral');
                        setTags('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">YHWH Date</label>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="font-semibold">
                        Year {currentYhwhDate.year}, Month {currentYhwhDate.month}, Day {currentYhwhDate.day}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {currentYhwhDate.weekDay === 7 ? 'Shabbat' : `Day ${currentYhwhDate.weekDay}`}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Gregorian Date</label>
                    <Input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Mood</label>
                  <div className="flex gap-2">
                    {(['happy', 'sad', 'neutral', 'excited', 'grateful'] as const).map((m) => {
                      const Icon = MOOD_ICONS[m];
                      return (
                        <button
                          key={m}
                          onClick={() => setMood(m)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            mood === m
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <Icon className={`h-6 w-6 ${MOOD_COLORS[m]}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Content</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your thoughts..."
                    rows={8}
                    className="resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tags (comma-separated)</label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="gratitude, reflection, shabbat..."
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  <div>Part of Yowm: {currentTime.part}</div>
                  <div>Watch: {Math.floor(currentTime.part / 4.5) + 1}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entries List */}
          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || moodFilter !== 'all' 
                      ? 'No entries match your filters'
                      : 'No entries yet. Start your journal journey!'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredEntries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="secondary">
                              Year {entry.yhwhDate.year}, Month {entry.yhwhDate.month}, Day {entry.yhwhDate.day}
                            </Badge>
                            {entry.yhwhDate.weekDay === 7 && (
                              <Badge className="bg-yellow-500/20 text-yellow-700">
                                Shabbat
                              </Badge>
                            )}
                            {entry.isTequvah && (
                              <Badge className="bg-amber-500/20 text-amber-700">
                                Tequvah
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {entry.gregorianDate}
                            {entry.partOfYowm && ` • Part ${entry.partOfYowm} of Yowm`}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {entry.mood && (
                            <div className={`${MOOD_COLORS[entry.mood]}`}>
                              {React.createElement(MOOD_ICONS[entry.mood], { className: 'h-5 w-5' })}
                            </div>
                          )}
                          <Button
                            onClick={() => handleEdit(entry)}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(entry.id)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap mb-3">{entry.content}</p>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {entry.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarGrid 
            entries={entries}
            onDateSelect={(date) => {
              setSelectedDate(date);
              const existingEntry = entries.find(e => {
                const entryDate = new Date(e.createdAt);
                return entryDate.toDateString() === date.toDateString();
              });
              if (existingEntry) {
                handleEdit(existingEntry);
              } else {
                handleNewEntry();
              }
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

