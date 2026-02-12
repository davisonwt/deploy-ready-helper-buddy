import { useState, useEffect } from "react"
import { cn, getGrowthStage, getGrowthStageColor } from "../lib/utils"
import { Sprout, Sparkles, Heart, Star } from "lucide-react"

export function AnimatedOrchardGrid({
  totalPockets = 120,
  pocketPrice = 150,
  takenPockets = [],
  selectedPockets = [],
  onPocketClick,
  pocketsPerRow = 10,
  showNumbers = true,
  interactive = true,
  className = "",
}) {
  const [animatingPockets, setAnimatingPockets] = useState(new Set())
  const [sparklingPockets, setSparklingPockets] = useState(new Set())
  const [compostingPockets, setCompostingPockets] = useState(new Set())
  
  // Generate grid layout
  const generateGrid = () => {
    const grid = []
    const rows = Math.ceil(totalPockets / pocketsPerRow)
    
    for (let row = 0; row < rows; row++) {
      const pocketsInRow = Math.min(pocketsPerRow, totalPockets - (row * pocketsPerRow))
      const rowPockets = []
      
      for (let col = 0; col < pocketsInRow; col++) {
        const pocketNumber = row * pocketsPerRow + col + 1
        rowPockets.push(pocketNumber)
      }
      
      grid.push(rowPockets)
    }
    
    return grid
  }
  
  const grid = generateGrid()
  
  // Animate new selections
  useEffect(() => {
    const newSelections = selectedPockets.filter(pocket => 
      !animatingPockets.has(pocket)
    )
    
    if (newSelections.length > 0) {
      const newAnimating = new Set(animatingPockets)
      newSelections.forEach(pocket => {
        newAnimating.add(pocket)
      })
      setAnimatingPockets(newAnimating)
      
      // Remove animation after 600ms
      setTimeout(() => {
        setAnimatingPockets(prev => {
          const updated = new Set(prev)
          newSelections.forEach(pocket => {
            updated.delete(pocket)
          })
          return updated
        })
      }, 600)
    }
  }, [selectedPockets, animatingPockets])
  
  // Sparkling effect for mature pockets
  useEffect(() => {
    const maturePockets = takenPockets.filter(pocket => 
      getGrowthStage(pocket.daysGrowing) === "mature"
    )
    
    if (maturePockets.length > 0) {
      const interval = setInterval(() => {
        const randomPocket = maturePockets[Math.floor(Math.random() * maturePockets.length)]
        setSparklingPockets(prev => new Set([...prev, randomPocket.number]))
        
        setTimeout(() => {
          setSparklingPockets(prev => {
            const updated = new Set(prev)
            updated.delete(randomPocket.number)
            return updated
          })
        }, 2000)
      }, 3000)
      
      return () => clearInterval(interval)
    }
  }, [takenPockets])
  
  const getPocketStatus = (pocketNumber) => {
    const takenPocket = takenPockets.find(p => p.number === pocketNumber)
    const isSelected = selectedPockets.includes(pocketNumber)
    const isAnimating = animatingPockets.has(pocketNumber)
    const isSparkling = sparklingPockets.has(pocketNumber)
    const isComposting = compostingPockets.has(pocketNumber)
    
    return {
      isTaken: !!takenPocket,
      isSelected,
      isAnimating,
      isSparkling,
      isComposting,
      takenPocket,
      growthStage: takenPocket ? getGrowthStage(takenPocket.daysGrowing) : null,
    }
  }
  
  const getPocketContent = (pocketNumber, status) => {
    if (status.isTaken) {
      // Show growth stage icon
      switch (status.growthStage) {
        case "sprout":
          return <Sprout className="h-3 w-3 text-success" />
        case "young":
          return <Sprout className="h-4 w-4 text-success" />
        case "growing":
          return <Sprout className="h-5 w-5 text-success" />
        case "mature":
          return <Star className="h-5 w-5 text-warning" />
        default:
          return <Sprout className="h-3 w-3 text-success" />
      }
    } else if (status.isSelected) {
      return <Heart className="h-4 w-4 text-white fill-white" />
    } else if (showNumbers) {
      return <span className="text-xs font-medium text-amber-900">{pocketNumber}</span>
    }
    
    return null
  }
  
  const getPocketClasses = (pocketNumber, status) => {
    const baseClasses = "relative w-8 h-8 rounded-full border-2 transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95"
    
    if (status.isTaken) {
      // Success colors for taken pockets (keep original styling)
      return cn(
        baseClasses,
        "bg-gradient-to-br from-success/60 to-success border-success",
        "hover:shadow-lg",
        status.isSparkling && "animate-pulse ring-2 ring-warning/50"
      )
    } else if (status.isSelected) {
      // Green background with heart for selected pockets
      return cn(
        baseClasses,
        "bg-green-500 border-green-700 border-2 text-white",
        "flex items-center justify-center",
        status.isAnimating && "animate-bounce scale-110"
      )
    } else {
      // Light brown with dark brown edge for available pockets
      return cn(
        baseClasses,
        "bg-amber-200 border-amber-800 border-2",
        "hover:bg-blue-400 hover:border-blue-700 hover:shadow-lg transition-all duration-200",
        !interactive && "cursor-default"
      )
    }
  }
  
  const handlePocketClick = (pocketNumber) => {
    if (!interactive) return
    
    const status = getPocketStatus(pocketNumber)
    if (status.isTaken) return
    
    // Trigger compost animation for new selections
    if (!status.isSelected) {
      setCompostingPockets(prev => new Set([...prev, pocketNumber]))
      setTimeout(() => {
        setCompostingPockets(prev => {
          const updated = new Set(prev)
          updated.delete(pocketNumber)
          return updated
        })
      }, 1500)
    }
    
    onPocketClick?.(pocketNumber)
  }
  
  const getPocketTooltip = (pocketNumber, status) => {
    if (status.isTaken) {
      return `Pocket ${pocketNumber} - ${status.takenPocket.bestower} - ${status.takenPocket.daysGrowing} days growing (${status.growthStage})`
    } else if (status.isSelected) {
      return `Pocket ${pocketNumber} - Selected (${formatCurrency(pocketPrice)})`
    } else {
      return `Pocket ${pocketNumber} - Available (${formatCurrency(pocketPrice)})`
    }
  }

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Grid Header */}
      <div className="text-center mb-6">
      <div className="flex justify-center items-center gap-6 text-sm text-card-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-200 border-2 border-amber-800 rounded-full"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 border-2 border-green-700 rounded-full"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-success/60 to-success border-2 border-success rounded-full"></div>
            <span>Growing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-success border-2 border-success/40 rounded-full"></div>
            <span>Mature</span>
          </div>
        </div>
      </div>
      
      {/* Orchard Grid */}
      <div className="bg-gradient-to-br from-success/10 to-warning/10 p-8 rounded-2xl border-2 border-success/30 shadow-inner">
        <div className="space-y-3">
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-2">
              {row.map(pocketNumber => {
                const status = getPocketStatus(pocketNumber)
                
                return (
                  <div
                    key={pocketNumber}
                    className={getPocketClasses(pocketNumber, status)}
                    onClick={() => handlePocketClick(pocketNumber)}
                    title={getPocketTooltip(pocketNumber, status)}
                  >
                    {/* Pocket Content */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {getPocketContent(pocketNumber, status)}
                    </div>
                    
                    {/* Sparkling Effect */}
                    {status.isSparkling && (
                      <div className="absolute -top-1 -right-1">
                        <Sparkles className="h-3 w-3 text-warning animate-spin" />
                      </div>
                    )}
                    
                    {/* Pulse Effect for New Selections */}
                    {status.isAnimating && (
                      <div className="absolute inset-0 rounded-lg bg-destructive/50 animate-ping"></div>
                    )}
                    
                    {/* Compost Falling Animation */}
                    {status.isComposting && (
                      <div className="absolute inset-0 pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute compost-particle"
                            style={{
                              left: `${15 + i * 8}%`,
                              top: '-15px',
                              width: '3px',
                              height: '3px',
                              backgroundColor: '#92400e', // brown-700
                              borderRadius: '50%',
                              animationDelay: `${i * 0.05}s`,
                              boxShadow: '0 0 2px rgba(146, 64, 14, 0.6)'
                            }}
                          />
                        ))}
                        {/* Dust cloud effect */}
                        <div
                          className="absolute w-6 h-6 bg-amber-600/20 rounded-full"
                          style={{
                            top: '25px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            animation: 'scale-in 0.8s ease-out 0.7s forwards',
                            opacity: 0,
                            animationFillMode: 'forwards'
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Growth Progress Ring */}
                    {status.isTaken && (
                      <div className="absolute -inset-0.5 rounded-lg">
                        <div 
                          className={cn(
                            "absolute inset-0 rounded-lg border-2 border-dashed",
                            status.growthStage === "sprout" && "border-success/60 animate-pulse",
                            status.growthStage === "young" && "border-success/80",
                            status.growthStage === "growing" && "border-success",
                            status.growthStage === "mature" && "border-warning animate-pulse"
                          )}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Growth Stage Info - IN A ROW */}
      <div className="flex gap-4 justify-center text-center text-sm">
        <div className="space-y-2">
          <div className="w-8 h-8 bg-success/20 rounded-lg mx-auto flex items-center justify-center">
            <Sprout className="h-4 w-4 text-success" />
          </div>
          <div>
            <div className="font-semibold text-foreground">Sprout</div>
            <div className="text-muted-foreground">0-7 days</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="w-8 h-8 bg-success/30 rounded-lg mx-auto flex items-center justify-center">
            <Sprout className="h-5 w-5 text-success" />
          </div>
          <div>
            <div className="font-semibold text-foreground">Young</div>
            <div className="text-muted-foreground">8-21 days</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="w-8 h-8 bg-success/40 rounded-lg mx-auto flex items-center justify-center">
            <Sprout className="h-6 w-6 text-success" />
          </div>
          <div>
            <div className="font-semibold text-foreground">Growing</div>
            <div className="text-muted-foreground">22-42 days</div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="w-8 h-8 bg-success rounded-lg mx-auto flex items-center justify-center">
            <Star className="h-5 w-5 text-warning" />
          </div>
          <div>
            <div className="font-semibold text-foreground">Mature</div>
            <div className="text-muted-foreground">43+ days</div>
          </div>
        </div>
      </div>
    </div>
  )
}