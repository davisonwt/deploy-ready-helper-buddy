import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Sprout } from 'lucide-react'
import { Badge } from './ui/badge'

export function OrchardHeader({ orchard, selectedPockets, takenPockets }) {
  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/browse-orchards" className="flex items-center space-x-3 group">
            <ArrowLeft className="h-5 w-5 text-green-600 group-hover:text-green-700 transition-colors" />
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center">
              <Sprout className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-800">
                {orchard.title || 'Orchard'}
              </h1>
              <p className="text-xs text-green-600">
                {orchard.grower || 'Unknown'} • {orchard.location || 'Unknown Location'}
              </p>
            </div>
          </Link>
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {selectedPockets.length} selected
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {takenPockets.length} growing
            </Badge>
          </div>
        </div>
      </div>
    </header>
  )
}