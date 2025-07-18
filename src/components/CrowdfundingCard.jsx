import React from 'react'
import { Heart } from 'lucide-react'

const CrowdfundingCard = ({ cardData, onSupport }) => {
  // Determine text color based on header background color
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
      {/* Blurred background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-success/10 to-info/10 opacity-20"></div>
      
      {/* Card content */}
      <div className="relative bg-card/90 backdrop-blur-sm">
        {/* Colored header */}
        <div 
          className={`w-full px-4 py-3 ${textColor}`}
          style={{ backgroundColor: cardData.headerColor }}
        >
          <h3 className="font-bold text-lg text-center truncate">
            {cardData.title}
          </h3>
        </div>
        
        {/* Card body */}
        <div className="p-4 space-y-4 relative">
          {/* Progress badge */}
          <div className="absolute top-4 right-4">
            <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-success">
                {cardData.progress}%
              </span>
            </div>
          </div>
          
          {/* Subtitle */}
          <p className="text-sm text-muted-foreground pr-12">
            {cardData.subtitle}
          </p>
          
          {/* User info */}
          <p className="text-sm text-muted-foreground/80">
            @ {cardData.user} - {cardData.location}
          </p>
          
          {/* Progress section */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">progress</span>
              <span className="font-medium text-foreground">
                r {cardData.raised.toLocaleString()} / r {cardData.needed.toLocaleString()}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-success h-2 rounded-full transition-all duration-300"
                style={{ width: `${cardData.progress}%` }}
              ></div>
            </div>
            
            {/* Pocket info */}
            <div className="flex justify-between text-xs text-muted-foreground/80">
              <span>{cardData.filledPockets} / {cardData.totalPockets} pockets</span>
              <span>{remaining} remaining</span>
            </div>
          </div>
          
          {/* Support button */}
          <button
            onClick={() => onSupport(cardData.id)}
            className="w-full bg-success hover:bg-success/90 text-success-foreground font-medium py-3 px-4 rounded-b-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Heart className="h-4 w-4" />
            bestow support
          </button>
        </div>
      </div>
    </div>
  )
}

export default CrowdfundingCard