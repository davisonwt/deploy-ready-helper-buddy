import React from 'react'
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
    <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-xl">
      <CardHeader className="text-center pb-4">
        <div className="mb-3">
          <CardTitle className="text-2xl font-bold text-green-800 mb-2">
            {orchard.title?.replace('Orchard for: ', '') || 'Artisan Craft Collection'}
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 mb-3">
            <span className="font-medium">
              {orchard.grower_full_name || orchard.grower || 'Community Artisan'}
            </span>
            <span className="text-green-400">•</span>
            <span>{orchard.location || 'Global Community'}</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge className="bg-green-100 text-green-800 px-3 py-1 text-xs">
              {orchard.category === 'product' ? 'Handcrafted Products' : orchard.category || 'Community Gift'}
            </Badge>
            {orchard.verification_status === "verified" && (
              <Badge className="bg-blue-100 text-blue-800 px-3 py-1 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-4">
          <div className="text-3xl font-bold text-green-800 mb-1">
            {formatAmount(orchard.pocket_price || 0)}
          </div>
          <div className="text-sm text-green-600">per pocket</div>
          <div className="text-xs text-green-500 mt-1">Support this beautiful creation</div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Compact Statistics */}
        <div className="flex gap-2 mb-4 justify-center">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl flex-1 text-center max-w-[140px] shadow-sm">
            <div className="text-xl font-bold text-green-800">{(orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0}</div>
            <div className="text-xs text-green-600">Total</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-3 rounded-xl flex-1 text-center max-w-[140px] shadow-sm">
            <div className="text-xl font-bold text-amber-800">{orchard.filled_pockets || 0}</div>
            <div className="text-xs text-amber-600">Growing</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl flex-1 text-center max-w-[140px] shadow-sm">
            <div className="text-xl font-bold text-blue-800">{((orchard.intended_pockets && orchard.intended_pockets > 1) ? orchard.intended_pockets : orchard.total_pockets || 0) - (orchard.filled_pockets || 0)}</div>
            <div className="text-xs text-blue-600">Available</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl flex-1 text-center max-w-[140px] shadow-sm">
            <div className="text-xl font-bold text-purple-800">{Math.round(orchard.completion_rate || 0)}%</div>
            <div className="text-xs text-purple-600">Complete</div>
          </div>
        </div>

        {/* Compact Description */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-2">✨ What You're Supporting</h4>
              <p className="text-xs text-gray-700">
                {orchard.why_needed || orchard.description?.replace('Auto-generated orchard from seed: ', '') || 
                 'Beautiful handcrafted beads calendar'}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-2">🌍 Community Impact</h4>
              <p className="text-xs text-gray-700">
                {orchard.community_impact !== 'No impact description available' ? orchard.community_impact : 
                 'Supporting local artisans and traditional craftsmanship'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Compact Stats Footer */}
        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-green-600" />
              <span>{orchard.views || 0} views</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-green-600" />
              <span>{orchard.supporters || 0} supporters</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-green-600" />
              <span>{orchard.timeline || 'Available now'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}