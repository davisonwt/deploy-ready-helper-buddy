import React, { useState, useRef, useEffect } from 'react'
import { useVisualEditor, ElementConfig } from '@/contexts/VisualEditorContext'

interface EditableTextProps {
  elementId: string
  defaultText: string
  x: number
  y: number
  fontSize?: number
  fill?: string
  textAnchor?: 'start' | 'middle' | 'end'
  dominantBaseline?: 'auto' | 'middle' | 'hanging' | 'baseline'
  transform?: string
  className?: string
  onTextChange?: (text: string) => void
}

export function EditableText({
  elementId,
  defaultText,
  x,
  y,
  fontSize = 12,
  fill = '#fff',
  textAnchor = 'middle',
  dominantBaseline = 'middle',
  transform,
  className = '',
  onTextChange
}: EditableTextProps) {
  const { isEditorMode, selectedElementId, setSelectedElementId, elementConfigs, updateElementConfig } = useVisualEditor()
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(defaultText)
  const inputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<SVGTextElement>(null)

  const config: ElementConfig = elementConfigs[elementId] || { id: elementId, type: 'text' }
  const displayText = config.text ?? text
  const configX = config.x ?? x
  const configY = config.y ?? y

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditorMode) return
    e.stopPropagation()
    setSelectedElementId(elementId)
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    updateElementConfig(elementId, { 
      text: displayText,
      type: 'text',
      x: configX,
      y: configY
    })
    onTextChange?.(displayText)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBlur()
    } else if (e.key === 'Escape') {
      setText(displayText)
      setIsEditing(false)
    }
  }

  if (!isEditorMode) {
    return (
      <text
        ref={textRef}
        x={x}
        y={y}
        fontSize={fontSize}
        fill={fill}
        textAnchor={textAnchor}
        dominantBaseline={dominantBaseline}
        transform={transform}
        className={className}
      >
        {displayText}
      </text>
    )
  }

  const isSelected = selectedElementId === elementId

  // Calculate screen position for input overlay
  const [screenX, setScreenX] = useState(0)
  const [screenY, setScreenY] = useState(0)

  useEffect(() => {
    if (textRef.current && isEditing) {
      const rect = textRef.current.getBoundingClientRect()
      setScreenX(rect.left)
      setScreenY(rect.top)
    }
  }, [isEditing, configX, configY])

  return (
    <>
      <text
        ref={textRef}
        x={configX}
        y={configY}
        fontSize={fontSize}
        fill={isSelected ? '#60a5fa' : fill}
        textAnchor={textAnchor}
        dominantBaseline={dominantBaseline}
        transform={transform}
        className={className}
        onClick={handleClick}
        style={{ cursor: isEditorMode ? 'pointer' : 'default' }}
      >
        {displayText}
      </text>
      
      {isSelected && (
        <circle
          cx={configX}
          cy={configY}
          r={fontSize * 0.8}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={2}
          strokeDasharray="4,4"
          opacity={0.5}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {isEditing && (
        <foreignObject
          x={screenX - 100}
          y={screenY - 15}
          width={200}
          height={30}
        >
          <input
            ref={inputRef}
            type="text"
            value={displayText}
            onChange={(e) => {
              setText(e.target.value)
              updateElementConfig(elementId, { 
                text: e.target.value,
                type: 'text'
              })
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="px-2 py-1 bg-gray-900 border border-blue-500 text-white rounded text-sm"
            style={{ width: '200px' }}
          />
        </foreignObject>
      )}
    </>
  )
}

