import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Download, 
  Share2, 
  Trash2,
  Eye,
  Calendar,
  FileText,
  Image,
  Video,
  Music,
  File
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import FilePreview from './FilePreview';

const getFileIcon = (fileType) => {
  const icons = {
    image: Image,
    video: Video,
    audio: Music,
    document: FileText,
  };
  return icons[fileType] || File;
};

const ChatFileManager = ({ roomId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'name', 'size'

  useEffect(() => {
    if (roomId) {
      fetchFiles();
    }
  }, [roomId]);

  const fetchFiles = async () => {
    if (!roomId) return;

    try {
      setLoading(true);
      
      // Get all messages with files from this room
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          file_url,
          file_name,
          file_type,
          file_size,
          created_at,
          sender_id,
          profiles!chat_messages_sender_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .not('file_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFiles(messages || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedFiles = files
    .filter(file => {
      // Filter by search term
      if (searchTerm && !file.file_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by file type
      if (filterType !== 'all' && file.file_type !== filterType) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'name':
          return a.file_name.localeCompare(b.file_name);
        case 'size':
          return (b.file_size || 0) - (a.file_size || 0);
        case 'newest':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

  const getFileStats = () => {
    const stats = {
      total: files.length,
      images: files.filter(f => f.file_type === 'image').length,
      videos: files.filter(f => f.file_type === 'video').length,
      audio: files.filter(f => f.file_type === 'audio').length,
      documents: files.filter(f => f.file_type === 'document').length,
      totalSize: files.reduce((sum, f) => sum + (f.file_size || 0), 0)
    };
    return stats;
  };

  const stats = getFileStats();

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadAll = async () => {
    // This would require implementing a zip download feature
    toast({
      title: "Feature coming soon",
      description: "Bulk download functionality will be available soon.",
    });
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredAndSortedFiles.map((file) => {
        const FileIcon = getFileIcon(file.file_type);
        return (
          <Card key={file.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="aspect-square mb-3 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {file.file_type === 'image' ? (
                  <img 
                    src={file.file_url} 
                    alt={file.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FileIcon className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium truncate" title={file.file_name}>
                  {file.file_name}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(file.file_size)}</span>
                  <Badge variant="outline" className="text-xs">
                    {file.file_type}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                </p>
                
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.open(file.file_url, '_blank')}
                    className="h-7 px-2"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.open(file.file_url, '_blank')}
                    className="h-7 px-2"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {filteredAndSortedFiles.map((file) => {
        const FileIcon = getFileIcon(file.file_type);
        return (
          <Card key={file.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.file_name}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatFileSize(file.file_size)}</span>
                    <Badge variant="outline" className="text-xs">
                      {file.file_type}
                    </Badge>
                    <span>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</span>
                    <span>by {file.profiles?.display_name || 'Unknown'}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.open(file.file_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.open(file.file_url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading files...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Shared Files
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* File Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Files</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{stats.images}</p>
            <p className="text-xs text-muted-foreground">Images</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{stats.videos}</p>
            <p className="text-xs text-muted-foreground">Videos</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{stats.audio}</p>
            <p className="text-xs text-muted-foreground">Audio</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{formatFileSize(stats.totalSize)}</p>
            <p className="text-xs text-muted-foreground">Total Size</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio</option>
              <option value="document">Documents</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
        </div>
        
        {/* Files Display */}
        {filteredAndSortedFiles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No files found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Files shared in this chat will appear here.'
              }
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            {viewMode === 'grid' ? renderGridView() : renderListView()}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatFileManager;