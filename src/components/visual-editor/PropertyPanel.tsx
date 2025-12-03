import React from 'react'
import { useVisualEditor, ElementConfig } from '@/contexts/VisualEditorContext'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function PropertyPanel() {
  const { selectedElementId, elementConfigs, updateElementConfig, setSelectedElementId, resetElementConfig } = useVisualEditor()

  if (!selectedElementId) return null

  const config: ElementConfig = elementConfigs[selectedElementId] || { id: selectedElementId, type: 'unknown' }

  const handleChange = (key: string, value: any) => {
    updateElementConfig(selectedElementId, { [key]: value })
  }

  const handleReset = () => {
    resetElementConfig(selectedElementId)
    setSelectedElementId(null)
  }

  return (
    <div className="fixed top-20 right-4 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-[9998] p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-semibold">Properties</h3>
        <Button
          onClick={() => setSelectedElementId(null)}
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-gray-300 text-sm">Element ID</Label>
          <Input
            value={selectedElementId}
            disabled
            className="bg-gray-800 text-gray-400 mt-1"
          />
        </div>

        <div>
          <Label className="text-gray-300 text-sm">Type</Label>
          <Input
            value={config.type || ''}
            disabled
            className="bg-gray-800 text-gray-400 mt-1"
          />
        </div>

        {config.x !== undefined && (
          <div>
            <Label className="text-gray-300 text-sm">X Position</Label>
            <Input
              type="number"
              value={config.x}
              onChange={(e) => handleChange('x', parseFloat(e.target.value) || 0)}
              className="bg-gray-800 text-white mt-1"
            />
          </div>
        )}

        {config.y !== undefined && (
          <div>
            <Label className="text-gray-300 text-sm">Y Position</Label>
            <Input
              type="number"
              value={config.y}
              onChange={(e) => handleChange('y', parseFloat(e.target.value) || 0)}
              className="bg-gray-800 text-white mt-1"
            />
          </div>
        )}

        {config.width !== undefined && (
          <div>
            <Label className="text-gray-300 text-sm">Width</Label>
            <Input
              type="number"
              value={config.width}
              onChange={(e) => handleChange('width', parseFloat(e.target.value) || 0)}
              className="bg-gray-800 text-white mt-1"
            />
          </div>
        )}

        {config.height !== undefined && (
          <div>
            <Label className="text-gray-300 text-sm">Height</Label>
            <Input
              type="number"
              value={config.height}
              onChange={(e) => handleChange('height', parseFloat(e.target.value) || 0)}
              className="bg-gray-800 text-white mt-1"
            />
          </div>
        )}

        {config.radius !== undefined && (
          <div>
            <Label className="text-gray-300 text-sm">Radius</Label>
            <Input
              type="number"
              value={config.radius}
              onChange={(e) => handleChange('radius', parseFloat(e.target.value) || 0)}
              className="bg-gray-800 text-white mt-1"
            />
          </div>
        )}

        {config.innerRadius !== undefined && (
          <div>
            <Label className="text-gray-300 text-sm">Inner Radius</Label>
            <Input
              type="number"
              value={config.innerRadius}
              onChange={(e) => handleChange('innerRadius', parseFloat(e.target.value) || 0)}
              className="bg-gray-800 text-white mt-1"
            />
          </div>
        )}

        {/* Text editing for text elements */}
        {config.type === 'text' && (
          <div>
            <Label className="text-gray-300 text-sm">Text Content</Label>
            <Input
              type="text"
              value={config.text || ''}
              onChange={(e) => handleChange('text', e.target.value)}
              className="bg-gray-800 text-white mt-1"
              placeholder="Enter text..."
            />
          </div>
        )}

        {/* Custom properties */}
        {Object.entries(config).map(([key, value]) => {
          if (['id', 'type', 'x', 'y', 'width', 'height', 'radius', 'innerRadius', 'text'].includes(key)) return null
          return (
            <div key={key}>
              <Label className="text-gray-300 text-sm capitalize">{key}</Label>
              <Input
                value={String(value)}
                onChange={(e) => handleChange(key, e.target.value)}
                className="bg-gray-800 text-white mt-1"
              />
            </div>
          )
        })}

        <Button
          onClick={handleReset}
          variant="destructive"
          size="sm"
          className="w-full mt-4"
        >
          Reset This Element
        </Button>
      </div>
    </div>
  )
}

