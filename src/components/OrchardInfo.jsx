import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { CheckCircle, Eye, Users, Clock } from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'

export function OrchardInfo({ orchard, takenPockets = [] }) {
  const { formatAmount } = useCurrency()

  // Calculate growth stage counts
  const growthStageCounts = {
    sprout: takenPockets.filter(p => p.stage === 'sprout').length,
    young: takenPockets.filter(p => p.stage === 'young').length,
    growing: takenPockets.filter(p => p.stage === 'growing').length,
    mature: takenPockets.filter(p => p.stage === 'mature').length
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-3xl text-green-800 mb-2">
              {orchard.title || 'Orchard'}
            </CardTitle>
            <p className="text-green-600 mb-2">
              {orchard.grower_full_name || orchard.grower || 'Unknown'} • {orchard.location || 'Unknown Location'}
            </p>
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-green-100 text-green-800">{orchard.category || 'General'}</Badge>
              {orchard.verification_status === "verified" && (
                <Badge className="bg-blue-100 text-blue-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-800">{formatAmount(orchard.pocket_price || 0)}</div>
            <div className="text-sm text-green-600">per pocket</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* First Row: Pocket Statistics */}
        <div className="flex gap-2 mb-4">
          <div className="bg-green-50 p-4 rounded-xl flex-1 text-center">
            <div className="text-2xl font-bold text-green-800">{orchard.total_pockets || 0}</div>
            <div className="text-sm text-green-600">Total</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl flex-1 text-center">
            <div className="text-2xl font-bold text-amber-800">{orchard.filled_pockets || 0}</div>
            <div className="text-sm text-amber-600">Growing</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl flex-1 text-center">
            <div className="text-2xl font-bold text-blue-800">{(orchard.total_pockets || 0) - (orchard.filled_pockets || 0)}</div>
            <div className="text-sm text-blue-600">Available</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl flex-1 text-center">
            <div className="text-2xl font-bold text-purple-800">{Math.round(orchard.completion_rate || 0)}%</div>
            <div className="text-sm text-purple-600">Complete</div>
          </div>
        </div>

        {/* Second Row: Growth Stages */}
        <div className="flex gap-2 mb-6">
          <div className="bg-emerald-50 p-4 rounded-xl flex-1 text-center">
            <div className="text-2xl font-bold text-emerald-800">{growthStageCounts.sprout}</div>
            <div className="text-sm text-emerald-600">Sprout 🌱</div>
          </div>
          <div className="bg-lime-50 p-4 rounded-xl flex-1 text-center">
            <div className="text-2xl font-bold text-lime-800">{growthStageCounts.young}</div>
            <div className="text-sm text-lime-600">Young 🌿</div>
          </div>
          <div className="bg-teal-50 p-4 rounded-xl flex-1 text-center">
            <div className="text-2xl font-bold text-teal-800">{growthStageCounts.growing}</div>
            <div className="text-sm text-teal-600">Growing 🌳</div>
          </div>
          <div className="bg-green-50 p-4 rounded-xl flex-1 text-center">
            <div className="text-2xl font-bold text-green-800">{growthStageCounts.mature}</div>
            <div className="text-sm text-green-600">Mature 🌲</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
            <p className="text-gray-700 text-sm">{orchard.why_needed || orchard.description || 'No description available'}</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Community Impact</h4>
            <p className="text-gray-700 text-sm">{orchard.community_impact || 'No impact description available'}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{orchard.views || 0} views</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{orchard.supporters || 0} supporters</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{orchard.timeline || 'No timeline'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}