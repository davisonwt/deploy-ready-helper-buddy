import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { CheckCircle, Eye, Users, Clock } from 'lucide-react'
import { useCurrency } from '../hooks/useCurrency'

export function OrchardInfo({ orchard }) {
  const { formatAmount } = useCurrency()

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-xl">
      <CardHeader className="text-center">
        <div className="mb-4">
          <CardTitle className="text-4xl font-bold text-green-800 mb-3">
            {orchard.title?.replace('Orchard for: ', '') || 'Artisan Craft Collection'}
          </CardTitle>
          <div className="flex items-center justify-center gap-3 text-green-600 mb-4">
            <span className="font-medium">
              {orchard.grower_full_name || orchard.grower || 'Community Artisan'}
            </span>
            <span className="text-green-400">•</span>
            <span>{orchard.location || 'Global Community'}</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-4 py-2 text-sm font-medium">
              {orchard.category === 'product' ? 'Handcrafted Products' : orchard.category || 'Community Gift'}
            </Badge>
            {orchard.verification_status === "verified" && (
              <Badge className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-800 px-4 py-2">
                <CheckCircle className="h-4 w-4 mr-2" />
                Verified Creator
              </Badge>
            )}
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-6">
          <div className="text-5xl font-bold text-green-800 mb-2">
            {formatAmount(orchard.pocket_price || 0)}
          </div>
          <div className="text-green-600 font-medium">per pocket</div>
          <div className="text-sm text-green-500 mt-2">
            Support this beautiful creation
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Pocket Statistics - Centered and Improved */}
        <div className="flex gap-3 mb-8 justify-center">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl flex-1 text-center max-w-[180px] shadow-sm">
            <div className="text-3xl font-bold text-green-800 mb-1">{orchard.total_pockets || 0}</div>
            <div className="text-sm font-medium text-green-600">Total Pockets</div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-2xl flex-1 text-center max-w-[180px] shadow-sm">
            <div className="text-3xl font-bold text-amber-800 mb-1">{orchard.filled_pockets || 0}</div>
            <div className="text-sm font-medium text-amber-600">Growing</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl flex-1 text-center max-w-[180px] shadow-sm">
            <div className="text-3xl font-bold text-blue-800 mb-1">{(orchard.total_pockets || 0) - (orchard.filled_pockets || 0)}</div>
            <div className="text-sm font-medium text-blue-600">Available</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl flex-1 text-center max-w-[180px] shadow-sm">
            <div className="text-3xl font-bold text-purple-800 mb-1">{Math.round(orchard.completion_rate || 0)}%</div>
            <div className="text-sm font-medium text-purple-600">Complete</div>
          </div>
        </div>

        {/* Description Section - Improved */}
        <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-8 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
            <div>
              <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
                ✨ What You're Supporting
              </h4>
              <p className="text-gray-700 leading-relaxed">
                {orchard.why_needed || orchard.description?.replace('Auto-generated orchard from seed: ', '') || 
                 'Beautiful handcrafted beads calendar - each pocket represents one complete artisan-made calendar that brings joy and organization to everyday life.'}
              </p>
            </div>
            <div>
              <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-2">
                🌍 Community Impact
              </h4>
              <p className="text-gray-700 leading-relaxed">
                {orchard.community_impact !== 'No impact description available' ? orchard.community_impact : 
                 'Supporting local artisans and traditional craftsmanship while creating beautiful, functional art that enriches homes and communities worldwide.'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Stats Footer - Improved */}
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-600" />
              <span className="font-medium">{orchard.views || 0} views</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="font-medium">{orchard.supporters || 0} supporters</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="font-medium">{orchard.timeline || 'Available now'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}