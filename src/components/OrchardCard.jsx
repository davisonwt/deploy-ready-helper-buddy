import { Heart } from 'lucide-react'
import { SocialActionButtons } from '@/components/social/SocialActionButtons'

const OrchardCard = ({ cardData, onSupport }) => {
  const getTextColor = (hexColor) => {
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? 'text-foreground' : 'text-primary-foreground'
  }

  const textColor = getTextColor(cardData.headerColor)
  const remaining = cardData.totalPockets - cardData.filledPockets

  return (
    <div className="relative bg-card rounded-lg shadow-lg overflow-hidden backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-success/10 to-info/10 opacity-20"></div>
      
      <div className="relative bg-card/90 backdrop-blur-sm">
        <div 
          className={`w-full px-4 py-3 ${textColor}`}
          style={{ backgroundColor: cardData.headerColor }}
        >
          <h3 className="font-bold text-lg text-center truncate">
            {cardData.title}
          </h3>
        </div>
        
        <div className="p-4 space-y-4 relative">
          <div className="absolute top-4 right-4">
            <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-success">
                {cardData.progress}%
              </span>
            </div>
          </div>
          
          <p className="text-sm text-white pr-12">
            {cardData.subtitle}
          </p>
          
          <p className="text-sm text-white/90">
            @ {cardData.user} - {cardData.location}
          </p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/90">growth journey</span>
              <span className="font-medium text-white">
                r {cardData.raised.toLocaleString()} / r {cardData.needed.toLocaleString()}
              </span>
            </div>
            
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-success h-2 rounded-full transition-all duration-300"
                style={{ width: `${cardData.progress}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-xs text-white/80">
              <span>{cardData.filledPockets} / {cardData.totalPockets} pockets</span>
              <span>{remaining} remaining</span>
            </div>
          </div>
          
          <button
            onClick={() => onSupport(cardData.id)}
            className="w-full bg-success hover:bg-success/90 text-success-foreground font-medium py-3 px-4 rounded-b-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Heart className="h-4 w-4" />
            bestow support
          </button>

          <div className="pt-2">
            <SocialActionButtons
              type="orchard"
              itemId={cardData.id}
              ownerId={cardData.userId}
              ownerName={cardData.user}
              ownerWallet={cardData.walletAddress}
              title={cardData.title}
              likeCount={cardData.likeCount || 0}
              isOwner={cardData.isOwner}
              variant="compact"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrchardCard

// Backward compatibility
export { OrchardCard as CrowdfundingCard }
