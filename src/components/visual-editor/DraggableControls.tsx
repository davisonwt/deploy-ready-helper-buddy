import React, { useState, useRef, useEffect } from 'react'
import { useVisualEditor, ElementConfig } from '@/contexts/VisualEditorContext'
import { GripVertical, Move, Maximize2 } from 'lucide-react'

interface DraggableControlsProps {
  elementId: string
  elementType: string
  children: React.ReactNode
  defaultX?: number
  defaultY?: number
  defaultWidth?: number
  defaultHeight?: number
  defaultRadius?: number
  onPositionChange?: (x: number, y: number) => void
  onSizeChange?: (width: number, height: number) => void
  onRadiusChange?: (radius: number) => void
  className?: string
  style?: React.CSSProperties
  allowDrag?: boolean
  allowResize?: boolean
  allowRadiusChange?: boolean
}

export function DraggableControls({
  elementId,
  elementType,
  children,
  defaultX = 0,
  defaultY = 0,
  defaultWidth,
  defaultHeight,
  defaultRadius,
  onPositionChange,
  onSizeChange,
  onRadiusChange,
  className = '',
  style = {},
  allowDrag = true,
  allowResize = false,
  allowRadiusChange = false
}: DraggableControlsProps) {
  const { isEditorMode, selectedElementId, setSelectedElementId, elementConfigs, updateElementConfig } = useVisualEditor()
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isRadiusChanging, setIsRadiusChanging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const config: ElementConfig = elementConfigs[elementId] || { id: elementId, type: elementType }
  const x = config.x ?? defaultX
  const y = config.y ?? defaultY
  const width = config.width ?? defaultWidth
  const height = config.height ?? defaultHeight
  const radius = config.radius ?? defaultRadius

  const isSelected = selectedElementId === elementId

  useEffect(() => {
    if (!isEditorMode) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current) {
        const rect = containerRef.current.parentElement?.getBoundingClientRect()
        if (rect) {
          const newX = e.clientX - rect.left - dragStart.x
          const newY = e.clientY - rect.top - dragStart.y
          updateElementConfig(elementId, { x: newX, y: newY, type: elementType })
          onPositionChange?.(newX, newY)
        }
      } else if (isResizing && containerRef.current) {
        const rect = containerRef.current.parentElement?.getBoundingClientRect()
        if (rect) {
          const newWidth = Math.max(50, e.clientX - rect.left - x)
          const newHeight = Math.max(50, e.clientY - rect.top - y)
          updateElementConfig(elementId, { width: newWidth, height: newHeight, type: elementType })
          onSizeChange?.(newWidth, newHeight)
        }
      } else if (isRadiusChanging && containerRef.current) {
        const rect = containerRef.current.parentElement?.getBoundingClientRect()
        if (rect && defaultRadius) {
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2
          const distance = Math.sqrt(
            Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
          )
          const newRadius = Math.max(10, Math.min(distance, rect.width / 2))
          updateElementConfig(elementId, { radius: newRadius, type: elementType })
          onRadiusChange?.(newRadius)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setIsRadiusChanging(false)
    }

    if (isDragging || isResizing || isRadiusChanging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, isRadiusChanging, dragStart, elementId, elementType, updateElementConfig, onPositionChange, onSizeChange, onRadiusChange, x, y, defaultRadius])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditorMode) return
    e.stopPropagation()
    setSelectedElementId(elementId)
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDragStart({
        x: e.clientX - rect.left - x,
        y: e.clientY - rect.top - y
      })
      setIsDragging(true)
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
  }

  const handleRadiusMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsRadiusChanging(true)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditorMode) return
    e.stopPropagation()
    setSelectedElementId(elementId)
  }

  if (!isEditorMode) {
    return <>{children}</>
  }

  const transformStyle: React.CSSProperties = {
    transform: `translate(${x}px, ${y}px)`,
    position: 'relative' as const,
    ...style
  }

  if (width && height) {
    transformStyle.width = `${width}px`
    transformStyle.height = `${height}px`
  }

  return (
    <div
      ref={containerRef}
      className={`draggable-element ${className} ${isSelected ? 'selected' : ''}`}
      style={transformStyle}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      {children}
      
      {/* Selection indicator */}
      {isSelected && (
        <div
          className="absolute inset-0 border-2 border-blue-500 pointer-events-none z-50"
          style={{
            borderRadius: radius ? '50%' : '4px',
            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)'
          }}
        />
      )}

      {/* Drag handle */}
      {isSelected && allowDrag && (
        <div
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white p-1 rounded cursor-move z-50 flex items-center gap-1"
          onMouseDown={(e) => {
            e.stopPropagation()
            handleMouseDown(e)
          }}
        >
          <Move className="w-3 h-3" />
          <span className="text-xs">Drag</span>
        </div>
      )}

      {/* Resize handle */}
      {isSelected && allowResize && width && height && (
        <div
          className="absolute bottom-0 right-0 bg-blue-500 w-4 h-4 cursor-se-resize z-50"
          onMouseDown={handleResizeMouseDown}
          style={{ borderRadius: '0 0 4px 0' }}
        />
      )}

      {/* Radius control handle (for circles) */}
      {isSelected && allowRadiusChange && radius && (
        <div
          className="absolute bg-blue-500 w-4 h-4 rounded-full cursor-pointer z-50 border-2 border-white"
          style={{
            top: '50%',
            left: `${(radius / (containerRef.current?.parentElement?.clientWidth || 1)) * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
          onMouseDown={handleRadiusMouseDown}
        />
      )}
    </div>
  )
}

