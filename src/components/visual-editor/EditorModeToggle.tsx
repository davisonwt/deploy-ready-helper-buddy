import React from 'react'
import { useVisualEditor } from '@/contexts/VisualEditorContext'
import { Edit, X, Save, RotateCcw } from 'lucide-react'
import { Button } from '../ui/button'
import { PropertyPanel } from './PropertyPanel'

export function EditorModeToggle() {
  const { isEditorMode, setIsEditorMode, selectedElementId, resetAllConfigs, saveConfig } = useVisualEditor()

  return (
    <>
      <div className="fixed top-4 right-4 z-[9999] flex gap-2">
        {!isEditorMode ? (
          <Button
            onClick={() => setIsEditorMode(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
            size="sm"
          >
            <Edit className="w-4 h-4 mr-2" />
            Visual Editor
          </Button>
        ) : (
          <>
            <Button
              onClick={() => setIsEditorMode(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white shadow-lg"
              size="sm"
            >
              <X className="w-4 h-4 mr-2" />
              Exit Editor
            </Button>
            <Button
              onClick={saveConfig}
              className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={() => {
                if (confirm('Reset all visual editor changes? This cannot be undone.')) {
                  resetAllConfigs()
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
              size="sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </>
        )}
      </div>

      {/* Property Panel */}
      {isEditorMode && selectedElementId && (
        <PropertyPanel />
      )}
    </>
  )
}

