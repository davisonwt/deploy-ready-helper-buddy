import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Music, 
  ShoppingCart, 
  Lock, 
  Clock,
  Info,
  Gift,
  Mic
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
  const [giftingTrack, setGiftingTrack] = useState(null)

  const isVoiceNote = (track) => {
    return track?.track_type === 'voice_note' || track?.track_type === 'voicenote'
  }

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

  const handleFreeWillGift = async (track) => {
    if (!user) {
      toast.error('Please log in to gift the DJ')
      return
    }
    // For now, trigger the same purchase flow - the backend handles delivery via DM
    toast.info(`🎁 Gift feature for "${track.track_title}" coming soon! The file will be sent to your personal chat with the DJ.`)
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getPricingBreakdown = (track) => {
    const rawPrice = Number(track?.price)
    const base = Number.isFinite(rawPrice) && rawPrice >= 2 ? rawPrice : 2
    const tithing = base * 0.1
    const admin = base * 0.05
    const total = base + tithing + admin
    return { base, tithing, admin, total }
  }

  const getTrackSlotNumber = (track, fallbackIndex = 0) => {
    const explicitSlot = Number(track?.slot_number ?? track?.slotNumber)
    if (Number.isInteger(explicitSlot) && explicitSlot > 0) return explicitSlot

    const identityIndex = tracks.findIndex((candidate) => candidate === track)
    if (identityIndex >= 0) return identityIndex + 1

    const fallbackMatchIndex = tracks.findIndex((candidate) =>
      candidate?.id === track?.id &&
      candidate?.file_url === track?.file_url &&
      candidate?.track_title === track?.track_title &&
      candidate?.artist_name === track?.artist_name
    )

    return fallbackMatchIndex >= 0 ? fallbackMatchIndex + 1 : fallbackIndex + 1
  }

  const currentTrackIndex = currentTrack
    ? tracks.findIndex((track, index) => getTrackSlotNumber(track, index) === getTrackSlotNumber(currentTrack, 0))
    : -1

  const orderedUpcomingTracks = tracks.length <= 1
    ? []
    : currentTrackIndex >= 0
      ? [...tracks.slice(currentTrackIndex + 1), ...tracks.slice(0, currentTrackIndex)]
      : tracks.slice(1)

  return (
    <>
      {/* Current Track */}
      {currentTrack && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isVoiceNote(currentTrack) ? <Mic className="h-5 w-5 text-primary" /> : <Music className="h-5 w-5 text-primary" />}
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
                  <Badge variant="secondary" className="text-xs">
                    Slot #{getTrackSlotNumber(currentTrack, currentTrackIndex >= 0 ? currentTrackIndex : 0)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {isVoiceNote(currentTrack) ? 'voice_note' : currentTrack.genre}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(currentTrack.duration_seconds)}
                  </span>
                </div>
              </div>

              {/* Music: show pricing + buy */}
              {!isVoiceNote(currentTrack) ? (
                <div className="flex flex-col gap-3 items-end">
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      ${getPricingBreakdown(currentTrack).total.toFixed(2)} USDC
                    </div>
                    <p className="text-xs text-muted-foreground">Total bestow amount</p>
                    <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                      <p>Base: ${getPricingBreakdown(currentTrack).base.toFixed(2)}</p>
                      <p>Tithing (10%): ${getPricingBreakdown(currentTrack).tithing.toFixed(2)}</p>
                      <p>Admin (5%): ${getPricingBreakdown(currentTrack).admin.toFixed(2)}</p>
                    </div>
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
              ) : (
                /* Voice note: free-will gift */
                <div className="flex flex-col gap-2 items-end">
                  <Badge variant="secondary" className="text-xs">Free</Badge>
                  <Button
                    variant="outline"
                    onClick={() => handleFreeWillGift(currentTrack)}
                    disabled={!user}
                    className="flex items-center gap-2"
                  >
                    <Gift className="h-4 w-4" />
                    Gift DJ
                  </Button>
                </div>
              )}
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Secure {isVoiceNote(currentTrack) ? 'Gift' : 'Purchase'}</p>
                  <p className="text-muted-foreground text-xs">
                    {isVoiceNote(currentTrack)
                      ? 'Gift the DJ and receive this voice note in your personal chat with them.'
                      : 'MP3 file will be sent privately to your direct messages. Files are not shareable with others.'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Tracks */}
      {orderedUpcomingTracks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Upcoming Tracks
              </span>
              <Badge variant="secondary" className="text-xs">
                {orderedUpcomingTracks.length} tracks
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {orderedUpcomingTracks.slice(0, 5).map((track, index) => {
                const voiceNote = isVoiceNote(track)
                const pricing = voiceNote ? null : getPricingBreakdown(track)
                const originalIndex = tracks.indexOf(track)
                const slotNumber = originalIndex >= 0 ? originalIndex + 1 : getTrackSlotNumber(track, index)

                return (
                  <div 
                    key={`${track.id}-${slotNumber}-${index}`} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-medium">
                        {slotNumber}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{track.track_title}</p>
                        <p className="text-xs text-foreground/70">{track.artist_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {voiceNote ? 'voice_note' : track.genre}
                          </Badge>
                          <span className="text-xs text-foreground/60">
                            {formatDuration(track.duration_seconds)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {voiceNote ? (
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="secondary" className="text-xs">Free</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFreeWillGift(track)}
                          disabled={!user}
                          className="text-xs h-7"
                        >
                          <Gift className="h-3 w-3 mr-1" />
                          Gift
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold">${pricing.total.toFixed(2)}</span>
                        <span className="text-[10px] text-muted-foreground">incl. 10% + 5%</span>
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
                    )}
                  </div>
                )
              })}
            </div>
            
            {orderedUpcomingTracks.length > 5 && (
              <div className="text-center mt-3">
                <p className="text-xs text-muted-foreground">
                  +{orderedUpcomingTracks.length - 5} more tracks in playlist
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
                    Purchase music tracks to get the MP3 sent to your messages. 
                    Voice notes are free — gift the DJ and receive the file in your personal chat.
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
