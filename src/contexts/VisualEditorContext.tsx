import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"

export interface ElementConfig {
  id: string
  type: string
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
  innerRadius?: number
  text?: string
  [key: string]: string | number | undefined // Allow custom properties
}

interface VisualEditorContextType {
  isEditorMode: boolean
  setIsEditorMode: (enabled: boolean) => void
  selectedElementId: string | null
  setSelectedElementId: (id: string | null) => void
  elementConfigs: Record<string, ElementConfig>
  updateElementConfig: (id: string, config: Partial<ElementConfig>) => void
  resetElementConfig: (id: string) => void
  saveConfig: () => void
  loadConfig: () => void
  resetAllConfigs: () => void
}

const VisualEditorContext = createContext<VisualEditorContextType | undefined>(undefined)

const STORAGE_KEY = 'visual-editor-configs'

export function VisualEditorProvider({ children }: { children: ReactNode }) {
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [elementConfigs, setElementConfigs] = useState<Record<string, ElementConfig>>({})

  // Load saved configs on mount
  useEffect(() => {
    loadConfig()
  }, [])

  const updateElementConfig = useCallback((id: string, config: Partial<ElementConfig>) => {
    setElementConfigs(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        id,
        ...config
      }
    }))
  }, [])

  const resetElementConfig = useCallback((id: string) => {
    setElementConfigs(prev => {
      const newConfigs = { ...prev }
      delete newConfigs[id]
      return newConfigs
    })
  }, [])

  const saveConfig = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(elementConfigs))
    } catch (error) {
      console.error('Failed to save visual editor config:', error)
    }
  }, [elementConfigs])

  const loadConfig = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setElementConfigs(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load visual editor config:', error)
    }
  }, [])

  const resetAllConfigs = useCallback(() => {
    setElementConfigs({})
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  // Auto-save when configs change (debounced to prevent infinite loops)
  useEffect(() => {
    if (Object.keys(elementConfigs).length > 0) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(elementConfigs))
        } catch (error) {
          console.error('Failed to auto-save visual editor config:', error)
        }
      }, 500) // Debounce by 500ms
      
      return () => clearTimeout(timeoutId)
    }
  }, [elementConfigs])

  const value = {
    isEditorMode,
    setIsEditorMode,
    selectedElementId,
    setSelectedElementId,
    elementConfigs,
    updateElementConfig,
    resetElementConfig,
    saveConfig,
    loadConfig,
    resetAllConfigs
  }

  return (
    <VisualEditorContext.Provider value={value}>
      {children}
    </VisualEditorContext.Provider>
  )
}

export function useVisualEditor() {
  const context = useContext(VisualEditorContext)
  if (context === undefined) {
    throw new Error('useVisualEditor must be used within a VisualEditorProvider')
  }
  return context
}

