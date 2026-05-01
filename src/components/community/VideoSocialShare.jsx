import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Share2, Copy, Facebook, Mail, Check, Linkedin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useReferralCode } from '@/hooks/useReferralCode'
import { burnReferralCode } from '@/lib/referral'

export default function VideoSocialShare({ video, orchard }) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const { code: referralCode } = useReferralCode()

  // Generate sharing URL — always burned with the sharer's invitation code
  const getShareUrl = () => {
    const baseUrl = window.location.origin
    const raw = orchard?.id
      ? `${baseUrl}/orchard/${orchard.id}?video=${video.id}`
      : `${baseUrl}/community-videos?video=${video.id}`
    return burnReferralCode(raw, referralCode)
  }

  const shareText = `Check out this amazing video: "${video.title}" on Sow2Grow! 🌱`
  const shareUrl = getShareUrl()
  const refTag = referralCode ? `\n\n🌿 You'll join my tribe (${referralCode}) when you sign up.` : ''
  const fullText = shareText + refTag

  const openWindow = (url) => window.open(url, '_blank', 'width=600,height=500,noopener,noreferrer')

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({ title: 'Link Copied!', description: 'Your invitation code is burned into the link.' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Copy Failed', description: 'Could not copy link.', variant: 'destructive' })
    }
  }

  const handleFacebookShare  = () => openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(fullText)}`)
  const handleTwitterShare   = () => openWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}&url=${encodeURIComponent(shareUrl)}&hashtags=Sow2Grow,Tribe`)
  const handleTelegramShare  = () => openWindow(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(fullText)}`)
  const handleWhatsAppShare  = () => openWindow(`https://wa.me/?text=${encodeURIComponent(fullText + ' ' + shareUrl)}`)
  const handleLinkedInShare  = () => openWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`)
  const handlePinterestShare = () => openWindow(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(fullText)}${video.thumbnail_url ? `&media=${encodeURIComponent(video.thumbnail_url)}` : ''}`)
  const handleEmailShare     = () => {
    const subject = encodeURIComponent(`Check out this video: ${video.title}`)
    const body = encodeURIComponent(`${fullText}\n\n${shareUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }
  const handleTikTokShare = () => {
    navigator.clipboard.writeText(`${fullText}\n${shareUrl}\n#Sow2Grow #Tribe`)
    toast({ title: 'Copied for TikTok', description: 'Paste into your TikTok caption.' })
  }
  const handleYouTubeShare = () => {
    navigator.clipboard.writeText(`${fullText}\n\nWatch here: ${shareUrl}`)
    toast({ title: 'Copied for YouTube', description: 'Paste into your video description.' })
  }
  const handleInstagramShare = () => {
    navigator.clipboard.writeText(`${fullText}\n${shareUrl}\n#Sow2Grow #Tribe`)
    toast({ title: 'Copied for Instagram', description: 'Paste into your Instagram caption or bio.' })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={(e) => e.stopPropagation()}>
          <Share2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm">Share this video</h4>
            {referralCode && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Invitation code <span className="font-mono text-primary">{referralCode}</span> is burned into every share.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Button onClick={handleCopyLink} variant="ghost" className="w-full justify-start h-auto p-2">
              {copied ? <Check className="h-4 w-4 mr-3 text-green-600" /> : <Copy className="h-4 w-4 mr-3" />}
              <span className="text-sm">Copy Link</span>
            </Button>

            <Button onClick={handleFacebookShare} variant="ghost" className="w-full justify-start h-auto p-2">
              <Facebook className="h-4 w-4 mr-3 text-blue-600" />
              <span className="text-sm">Facebook</span>
            </Button>

            <Button onClick={handleTwitterShare} variant="ghost" className="w-full justify-start h-auto p-2">
              <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <span className="text-sm">X (Twitter)</span>
            </Button>

            <Button onClick={handleLinkedInShare} variant="ghost" className="w-full justify-start h-auto p-2">
              <Linkedin className="h-4 w-4 mr-3 text-[#0A66C2]" />
              <span className="text-sm">LinkedIn</span>
            </Button>

            <Button onClick={handlePinterestShare} variant="ghost" className="w-full justify-start h-auto p-2">
              <svg className="h-4 w-4 mr-3 text-[#E60023]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12c0 5 3.1 9.3 7.5 11-.1-.9-.2-2.4 0-3.4.2-.9 1.4-5.7 1.4-5.7s-.4-.7-.4-1.8c0-1.7 1-3 2.2-3 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 4-.3 1.2.6 2.2 1.8 2.2 2.1 0 3.8-2.3 3.8-5.5 0-2.9-2.1-4.9-5-4.9-3.4 0-5.4 2.6-5.4 5.2 0 1 .4 2.1.9 2.7.1.1.1.2.1.3l-.3 1.4c-.1.2-.2.3-.4.2-1.5-.7-2.4-2.9-2.4-4.7 0-3.8 2.8-7.4 8-7.4 4.2 0 7.5 3 7.5 7 0 4.2-2.6 7.5-6.3 7.5-1.2 0-2.4-.6-2.8-1.4l-.8 2.9c-.3 1.1-1 2.5-1.5 3.4 1.1.3 2.3.5 3.5.5 6.6 0 12-5.4 12-12S18.6 0 12 0z"/></svg>
              <span className="text-sm">Pinterest</span>
            </Button>

            <Button onClick={handleTelegramShare} variant="ghost" className="w-full justify-start h-auto p-2">
              <svg className="h-4 w-4 mr-3 text-[#229ED9]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.58 7.44c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.33-3.91c.19-.17-.04-.26-.29-.1l-5.35 3.37-2.31-.72c-.5-.16-.51-.5.11-.74l9.03-3.48c.42-.16.78.1.65.73z"/></svg>
              <span className="text-sm">Telegram</span>
            </Button>

            <Button onClick={handleWhatsAppShare} variant="ghost" className="w-full justify-start h-auto p-2">
              <svg className="h-4 w-4 mr-3 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              <span className="text-sm">WhatsApp</span>
            </Button>

            <Button onClick={handleTikTokShare} variant="ghost" className="w-full justify-start h-auto p-2">
              <svg className="h-4 w-4 mr-3" viewBox="0 0 24 24" fill="currentColor"><path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.948-1.254-2.12-1.254-2.12S16.423 1.85 16.423.972h-3.322v14.307c0 2.363-1.916 4.279-4.279 4.279-2.363 0-4.279-1.916-4.279-4.279 0-2.363 1.916-4.279 4.279-4.279.297 0 .58.034.854.088v-3.37C8.96 7.66 8.233 7.6 7.5 7.6c-4.142 0-7.5 3.358-7.5 7.5s3.358 7.5 7.5 7.5 7.5-3.358 7.5-7.5V9.841a9.77 9.77 0 0 0 5.645 1.802v-3.322c-1.645 0-3.322-.759-3.322-2.759Z"/></svg>
              <span className="text-sm">Copy for TikTok</span>
            </Button>

            <Button onClick={handleYouTubeShare} variant="ghost" className="w-full justify-start h-auto p-2">
              <svg className="h-4 w-4 mr-3 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z"/></svg>
              <span className="text-sm">Copy for YouTube</span>
            </Button>

            <Button onClick={handleInstagramShare} variant="ghost" className="w-full justify-start h-auto p-2">
              <svg className="h-4 w-4 mr-3 text-[#E4405F]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              <span className="text-sm">Copy for Instagram</span>
            </Button>

            <Button onClick={handleEmailShare} variant="ghost" className="w-full justify-start h-auto p-2">
              <Mail className="h-4 w-4 mr-3" />
              <span className="text-sm">Email</span>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
