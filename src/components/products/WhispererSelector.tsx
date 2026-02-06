import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Search, CheckCircle, Users, DollarSign } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface Whisperer {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  specialties: string[] | null;
  total_earnings: number;
  total_products_promoted: number;
  is_verified: boolean;
  profile?: {
    avatar_url: string | null;
  } | null;
}

interface WhispererSelectorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedWhisperer: Whisperer | null;
  onWhispererSelect: (whisperer: Whisperer | null) => void;
  commissionPercent: number;
  onCommissionChange: (percent: number) => void;
}

export function WhispererSelector({
  enabled,
  onEnabledChange,
  selectedWhisperer,
  onWhispererSelect,
  commissionPercent,
  onCommissionChange,
}: WhispererSelectorProps) {
  const [whisperers, setWhisperers] = useState<Whisperer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (isDialogOpen) {
      fetchWhisperers();
    }
  }, [isDialogOpen]);

  const fetchWhisperers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whisperers')
        .select(`
          id,
          user_id,
          display_name,
          bio,
          specialties,
          total_earnings,
          total_products_promoted,
          is_verified,
          profile:profiles(avatar_url)
        `)
        .eq('is_active', true)
        .order('total_products_promoted', { ascending: false });

      if (error) throw error;
      
      // Transform the data to handle the profile join correctly
      const transformedData = (data || []).map((w: any) => ({
        ...w,
        profile: Array.isArray(w.profile) ? w.profile[0] : w.profile
      }));
      
      setWhisperers(transformedData);
    } catch (error) {
      console.error('Error fetching whisperers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWhisperers = whisperers.filter(w =>
    w.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (w.bio?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (w.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const sowerReceives = 85 - commissionPercent;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Activate Whisperer</CardTitle>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
        <CardDescription className="text-sm">
          Let a whisperer (marketing agent) promote your product to our community
        </CardDescription>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          {/* Selected Whisperer */}
          {selectedWhisperer ? (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar>
                <AvatarImage src={selectedWhisperer.profile?.avatar_url || ''} />
                <AvatarFallback>
                  {selectedWhisperer.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedWhisperer.display_name}</span>
                  {selectedWhisperer.is_verified && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedWhisperer.total_products_promoted} products promoted
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onWhispererSelect(null)}
              >
                Change
              </Button>
            </div>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Users className="mr-2 h-4 w-4" />
                  Browse Whisperers
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Select a Whisperer</DialogTitle>
                </DialogHeader>
                
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search whisperers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[300px] mt-4">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading whisperers...
                    </div>
                  ) : filteredWhisperers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {whisperers.length === 0 
                        ? 'No whisperers available yet'
                        : 'No whisperers match your search'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredWhisperers.map((whisperer) => (
                        <button
                          key={whisperer.id}
                          onClick={() => {
                            onWhispererSelect(whisperer);
                            setIsDialogOpen(false);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors text-left"
                        >
                          <Avatar>
                            <AvatarImage src={whisperer.profile?.avatar_url || ''} />
                            <AvatarFallback>
                              {whisperer.display_name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {whisperer.display_name}
                              </span>
                              {whisperer.is_verified && (
                                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            {whisperer.bio && (
                              <p className="text-xs text-muted-foreground truncate">
                                {whisperer.bio}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {whisperer.specialties?.slice(0, 2).map((s) => (
                                <Badge key={s} variant="secondary" className="text-xs">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <div>{whisperer.total_products_promoted} products</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}

          {/* Commission Slider */}
          {selectedWhisperer && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Whisperer Commission</Label>
                <span className="text-sm font-medium">{commissionPercent}%</span>
              </div>
              
              <Slider
                value={[commissionPercent]}
                onValueChange={([value]) => onCommissionChange(value)}
                min={5}
                max={50}
                step={5}
                className="w-full"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5%</span>
                <span>50%</span>
              </div>

              {/* Distribution Summary */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span>You receive:</span>
                </div>
                <div className="text-right font-medium text-primary">
                  {sowerReceives}%
                </div>
                
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-accent-foreground" />
                  <span>Whisperer:</span>
                </div>
                <div className="text-right font-medium text-accent-foreground">
                  {commissionPercent}%
                </div>

                <div className="col-span-2 border-t pt-2 mt-1 text-xs text-muted-foreground">
                  Plus: 10% tithing + 5% admin (paid by bestower)
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
