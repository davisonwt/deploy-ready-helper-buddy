import { Link } from 'react-router-dom'
import { ArrowLeft, Sprout } from 'lucide-react'
import { Badge } from './ui/badge'

export function OrchardHeader({ orchard, selectedPockets, takenPockets }) {
  return (
    <header className="bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Link to="/browse-orchards" className="flex items-center space-x-3 group">
            <ArrowLeft className="h-5 w-5 text-primary group-hover:text-primary/80 transition-colors flex-shrink-0" />
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center flex-shrink-0">
              <Sprout className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-card-foreground line-clamp-1">
                {orchard.title || 'Orchard'}
              </h1>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {orchard.grower || 'Unknown'} • {orchard.location || 'Unknown Location'}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-primary/20 text-primary whitespace-nowrap">
              {selectedPockets.length} selected
            </Badge>
            <Badge variant="secondary" className="bg-primary/20 text-primary whitespace-nowrap">
              {takenPockets.length} growing
            </Badge>
          </div>
        </div>
      </div>
    </header>
  )
}