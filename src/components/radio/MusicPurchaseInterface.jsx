import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Music, 
  ShoppingCart, 
  Download, 
  Lock, 
  Check,
  Clock,
  DollarSign,
  Info
} from 'lucide-react'
import { useMusicPurchase } from '@/hooks/useMusicPurchase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export function MusicPurchaseInterface({ 
  tracks = [], 
  currentTrack = null, 
  showPurchaseDialog = false, 
  setShowPurchaseDialog 
}) {
  const { user } = useAuth()
  const { purchaseTrack, loading: purchasing } = useMusicPurchase()
  const [selectedTrack, setSelectedTrack] = useState(null)

  const handlePurchaseTrack = async (track) => {
    if (!user) {
      toast.error('Please log in to purchase music tracks')
      return
    }

    const result = await purchaseTrack(track)
    if (result.success) {
      setShowPurchaseDialog(false)
      setSelectedTrack(null)
      toast.success(`🎵 "${track.track_title}" purchased! Check your direct messages.`)
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <>
      {/* Current Track Purchase */}
      {currentTrack && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Music className="h-5 w-5 text-primary" />
              Now Playing
              <Badge variant="default" className="text-xs">LIVE</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-lg">{currentTrack.track_title}</h4>
                <p className="text-muted-foreground">{currentTrack.artist_name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {currentTrack.genre}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(currentTrack.duration_seconds)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 items-end">
                <div className="text-right">
                  <div className="flex items-center gap-1 text-lg font-bold text-primary">
                    <DollarSign className="h-4 w-4" />
                    {currentTrack.price ? `$${Number(currentTrack.price).toFixed(2)}` : 'Free'} USDC
                  </div>
                  <p className="text-xs text-muted-foreground">Total price</p>
                </div>
                <Button
                  onClick={() => handlePurchaseTrack(currentTrack)}
                  disabled={purchasing || !user}
                  className="flex items-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {purchasing ? 'Processing...' : 'Buy MP3'}
                </Button>
              </div>
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Secure Purchase</p>
                  <p className="text-muted-foreground text-xs">
                    MP3 file will be sent privately to your direct messages. Files are not shareable with others.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Tracks */}
      {tracks.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Upcoming Tracks
              </span>
              <Badge variant="secondary" className="text-xs">
                {tracks.length - 1} tracks
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {tracks.slice(1, 6).map((track, index) => (
                <div 
                  key={track.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-medium">
                      {index + 2}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{track.track_title}</p>
                      <p className="text-xs text-muted-foreground">{track.artist_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {track.genre}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(track.duration_seconds)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold">${track.price ? Number(track.price).toFixed(2) : '0.00'}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePurchaseTrack(track)}
                      disabled={purchasing || !user}
                      className="text-xs h-7"
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Buy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {tracks.length > 6 && (
              <div className="text-center mt-3">
                <p className="text-xs text-muted-foreground">
                  +{tracks.length - 6} more tracks in playlist
                </p>
              </div>
            )}
            
            <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    💡 How it works
                  </p>
                  <p className="text-blue-700 dark:text-blue-200 text-xs mt-1">
                    Purchase any track to get the high-quality MP3 file sent directly to your messages. 
                    Each purchase is private and files cannot be shared with others.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No tracks available */}
      {(!tracks || tracks.length === 0) && !currentTrack && (
        <Card>
          <CardContent className="py-8 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tracks available</h3>
            <p className="text-muted-foreground text-sm">
              This radio session doesn't have any purchasable tracks at the moment.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export default MusicPurchaseInterface