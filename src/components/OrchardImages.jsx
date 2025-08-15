import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Sprout } from 'lucide-react'

export function OrchardImages({ orchard }) {
  if (!orchard.images || !Array.isArray(orchard.images) || orchard.images.length === 0) {
    return null
  }

  return (
    <Card className="bg-white/95 backdrop-blur-sm border-green-200 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl text-green-800 text-center">
          📸 What You're Supporting
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orchard.images.slice(0, 3).map((image, index) => (
            <div key={index} className="relative">
              <img
                src={image}
                alt={`${orchard.title} - Image ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg border border-gray-200 shadow-md hover:shadow-xl transition-shadow"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div 
                className="w-full h-48 bg-green-100 rounded-lg border border-gray-200 shadow-md flex items-center justify-center text-green-600"
                style={{ display: 'none' }}
              >
                <div className="text-center">
                  <Sprout className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">Image not available</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {orchard.images.length > 3 && (
          <p className="text-center text-sm text-gray-600 mt-4">
            +{orchard.images.length - 3} more images
          </p>
        )}
      </CardContent>
    </Card>
  )
}