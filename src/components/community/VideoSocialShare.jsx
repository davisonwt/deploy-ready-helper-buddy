import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Share2, Copy, Facebook, MessageCircle, Mail, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function VideoSocialShare({ video, orchard }) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Generate sharing URL - leads to orchard page or video
  const getShareUrl = () => {
    const baseUrl = window.location.origin
    if (orchard?.id) {
      return `${baseUrl}/orchard/${orchard.id}?video=${video.id}`
    }
    return `${baseUrl}/community-videos?video=${video.id}`
  }

  const shareText = `Check out this amazing video: "${video.title}" on Sow2Grow! 🌱`
  const shareUrl = getShareUrl()

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({
        title: "Link Copied!",
        description: "Share link has been copied to clipboard"
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive"
      })
    }
  }

  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`
    window.open(fbUrl, '_blank', 'width=600,height=400')
  }

  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`
    window.open(waUrl, '_blank')
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out this video: ${video.title}`)
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleTikTokShare = () => {
    // TikTok doesn't have a direct share URL, so we copy to clipboard with TikTok-friendly format
    const tikTokText = `Check out this amazing video on Sow2Grow! 🌱 ${video.title} ${shareUrl} #Sow2Grow #Community`
    navigator.clipboard.writeText(tikTokText)
    toast({
      title: "TikTok Text Copied!",
      description: "Share text copied to clipboard for TikTok"
    })
  }

  const handleYouTubeShare = () => {
    // YouTube doesn't have direct share for external links, copy for description
    const youtubeText = `${shareText}\n\nWatch here: ${shareUrl}`
    navigator.clipboard.writeText(youtubeText)
    toast({
      title: "YouTube Description Copied!",
      description: "Share text copied for YouTube description"
    })
  }

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    window.open(telegramUrl, '_blank')
  }

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=Sow2Grow,Community,Videos`
    window.open(twitterUrl, '_blank', 'width=600,height=400')
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Share this video</h4>
          
          <div className="space-y-2">
            <Button
              onClick={handleCopyLink}
              variant="ghost"
              className="w-full justify-start h-auto p-3"
            >
              {copied ? (
                <Check className="h-4 w-4 mr-3 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 mr-3" />
              )}
              <span className="text-sm">Copy Link</span>
            </Button>

            <Button
              onClick={handleFacebookShare}
              variant="ghost"
              className="w-full justify-start h-auto p-3"
            >
              <Facebook className="h-4 w-4 mr-3 text-blue-600" />
              <span className="text-sm">Share on Facebook</span>
            </Button>

            <Button
              onClick={handleTwitterShare}
              variant="ghost"
              className="w-full justify-start h-auto p-3"
            >
              <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span className="text-sm">Share on X (Twitter)</span>
            </Button>

            <Button
              onClick={handleTelegramShare}
              variant="ghost"
              className="w-full justify-start h-auto p-3"
            >
              <svg className="h-4 w-4 mr-3 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.58 7.44c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.33-3.91c.19-.17-.04-.26-.29-.1l-5.35 3.37-2.31-.72c-.5-.16-.51-.5.11-.74l9.03-3.48c.42-.16.78.1.65.73z"/>
              </svg>
              <span className="text-sm">Share on Telegram</span>
            </Button>

            <Button
              onClick={handleTikTokShare}
              variant="ghost"
              className="w-full justify-start h-auto p-3"
            >
              <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.948-1.254-2.12-1.254-2.12S16.423 1.85 16.423.972h-3.322v14.307c0 2.363-1.916 4.279-4.279 4.279-2.363 0-4.279-1.916-4.279-4.279 0-2.363 1.916-4.279 4.279-4.279.297 0 .58.034.854.088v-3.37C8.96 7.66 8.233 7.6 7.5 7.6c-4.142 0-7.5 3.358-7.5 7.5s3.358 7.5 7.5 7.5 7.5-3.358 7.5-7.5V9.841a9.77 9.77 0 0 0 5.645 1.802v-3.322c-1.645 0-3.322-.759-3.322-2.759Z"/>
              </svg>
              <span className="text-sm">Copy for TikTok</span>
            </Button>

            <Button
              onClick={handleYouTubeShare}
              variant="ghost"
              className="w-full justify-start h-auto p-3"
            >
              <svg className="h-4 w-4 mr-3 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z"/>
              </svg>
              <span className="text-sm">Copy for YouTube</span>
            </Button>

            <Button
              onClick={handleEmailShare}
              variant="ghost"
              className="w-full justify-start h-auto p-3"
            >
              <Mail className="h-4 w-4 mr-3" />
              <span className="text-sm">Share via Email</span>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}