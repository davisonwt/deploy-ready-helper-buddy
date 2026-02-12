import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { CheckCircle, Eye, Users, Clock } from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'

export function OrchardInfo({ orchard }) {
  const { formatAmount } = useCurrency()
  
  // Debug logging for pocket values
  console.log('🔍 OrchardInfo Debug:', {
    title: orchard.title,
    total_pockets: orchard.total_pockets,
    intended_pockets: orchard.intended_pockets,
    filled_pockets: orchard.filled_pockets,
    actualPockets: (orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0,
    pocket_price: orchard.pocket_price
  })

  return (
    <Card className="bg-card border-border shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mb-3">
          <CardTitle className="text-2xl font-bold text-card-foreground mb-2">
            {orchard.title?.replace('Orchard for: ', '') || 'Artisan Craft Collection'}
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
            <span className="font-medium">
              {orchard.grower_full_name || orchard.grower || 'Community Artisan'}
            </span>
            <span>•</span>
            <span>{orchard.location || 'Global Community'}</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge className="bg-primary/20 text-primary px-3 py-1 text-xs">
              {orchard.category === 'product' ? 'Handcrafted Products' : orchard.category || 'Community Gift'}
            </Badge>
            {orchard.verification_status === "verified" && (
              <Badge className="bg-blue-500/20 text-blue-300 px-3 py-1 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>
        
        <div className="bg-card/80 border border-border rounded-xl p-4 mb-4">
          <div className="text-3xl font-bold text-card-foreground mb-1">
            {formatAmount(orchard.pocket_price || 0)}
          </div>
          <div className="text-sm text-muted-foreground">per pocket</div>
          <div className="text-xs text-muted-foreground mt-1">Support this beautiful creation</div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Compact Statistics */}
        <div className="flex gap-2 mb-4 justify-center">
          <div className="bg-green-500/20 border border-green-500/30 p-3 rounded-xl flex-1 text-center max-w-[140px]">
            <div className="text-xl font-bold text-green-300">{(orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0}</div>
            <div className="text-xs text-green-400">Total</div>
          </div>
          <div className="bg-amber-500/20 border border-amber-500/30 p-3 rounded-xl flex-1 text-center max-w-[140px]">
            <div className="text-xl font-bold text-amber-300">{orchard.filled_pockets || 0}</div>
            <div className="text-xs text-amber-400">Growing</div>
          </div>
          <div className="bg-blue-500/20 border border-blue-500/30 p-3 rounded-xl flex-1 text-center max-w-[140px]">
            <div className="text-xl font-bold text-blue-300">{((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0) - (orchard.filled_pockets || 0)}</div>
            <div className="text-xs text-blue-400">Available</div>
          </div>
          <div className="bg-purple-500/20 border border-purple-500/30 p-3 rounded-xl flex-1 text-center max-w-[140px]">
            <div className="text-xl font-bold text-purple-300">{Math.round(orchard.completion_rate || 0)}%</div>
            <div className="text-xs text-purple-400">Complete</div>
          </div>
        </div>

        {/* Compact Description */}
        <div className="bg-card/60 border border-border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
            <div>
              <h4 className="text-sm font-bold text-card-foreground mb-2">✨ What You're Supporting</h4>
              <p className="text-xs text-muted-foreground">
                {orchard.why_needed || orchard.description?.replace('Auto-generated orchard from seed: ', '') || 
                 'Beautiful handcrafted beads calendar'}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-card-foreground mb-2">🌍 Community Impact</h4>
              <p className="text-xs text-muted-foreground">
                {orchard.community_impact !== 'No impact description available' ? orchard.community_impact : 
                 'Supporting local artisans and traditional craftsmanship'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Compact Stats Footer */}
        <div className="bg-card/40 border border-border rounded-lg p-3">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-primary" />
              <span>{orchard.views || 0} views</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-primary" />
              <span>{orchard.supporters || 0} supporters</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              <span>{orchard.timeline || 'Available now'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}