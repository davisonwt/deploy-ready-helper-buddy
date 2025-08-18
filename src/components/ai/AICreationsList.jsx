import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Star, Copy, Download } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { formatDistanceToNow } from 'date-fns';

export const AICreationsList = () => {
  const [creations, setCreations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { getMyCreations, deleteCreation, toggleFavorite } = useAIAssistant();

  useEffect(() => {
    loadCreations();
  }, [filter]);

  const loadCreations = async () => {
    setLoading(true);
    const data = await getMyCreations(filter);
    setCreations(data);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (await deleteCreation(id)) {
      setCreations(creations.filter(c => c.id !== id));
    }
  };

  const handleToggleFavorite = async (id, currentState) => {
    if (await toggleFavorite(id, currentState)) {
      setCreations(creations.map(c => 
        c.id === id ? { ...c, is_favorited: !currentState } : c
      ));
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your creations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My AI Creations</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="script">Scripts</SelectItem>
            <SelectItem value="marketing_tip">Marketing Tips</SelectItem>
            <SelectItem value="thumbnail">Thumbnails</SelectItem>
            <SelectItem value="content_idea">Content Ideas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {creations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No creations found. Start generating some AI content!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {creations.map((creation) => (
            <Card key={creation.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{creation.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{creation.content_type.replace('_', ' ')}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(creation.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFavorite(creation.id, creation.is_favorited)}
                    >
                      <Star className={`w-4 h-4 ${creation.is_favorited ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(creation.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {creation.image_url ? (
                  <img src={creation.image_url} alt="Generated thumbnail" className="w-full max-w-md rounded-lg mb-4" />
                ) : (
                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <p className="text-sm line-clamp-3">{creation.content_text}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                  {creation.image_url && (
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};