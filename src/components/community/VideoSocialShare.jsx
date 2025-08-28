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
              onClick={handleWhatsAppShare}
              variant="ghost"
              className="w-full justify-start h-auto p-3"
            >
              <MessageCircle className="h-4 w-4 mr-3 text-green-600" />
              <span className="text-sm">Share on WhatsApp</span>
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