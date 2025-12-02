import React, { useMemo, useEffect } from 'react'
import { YHVHWheelCalendar } from './YHVHWheelCalendar'
import { useVisualEditor } from '@/contexts/VisualEditorContext'
import { DraggableControls } from '../visual-editor/DraggableControls'

// Import constants from wheel calendar
const LEADERS = [
  { name: "Malki'el", image: 'Lion', representative: 'Moses & Aaron', months: '1,2,3', color: '#fbbf24' },
  { name: 'Hemel-melek', image: 'Man', representative: 'Kohath', months: '4,5,6', color: '#22c55e' },
  { name: "Mel'eyal", image: 'Ox', representative: 'Gershon', months: '7,8,9', color: '#f97316' },
  { name: "Nar'el", image: 'Eagle', representative: 'Moses & Merari', months: '10,11,12', color: '#3b82f6' },
];

interface YHVHWheelCalendarEditableProps {
  dayOfYear?: number
  dayOfMonth?: number
  month?: number
  weekOfYear?: number
  dayOfWeek?: number
  partOfDay?: number
  size?: number
}

export function YHVHWheelCalendarEditable(props: YHVHWheelCalendarEditableProps) {
  const { isEditorMode, elementConfigs, updateElementConfig, setSelectedElementId } = useVisualEditor()
  const { size = 800 } = props

  // Expose context to window for text click handler
  React.useEffect(() => {
    if (typeof window !== 'undefined' && isEditorMode) {
      (window as any).__VISUAL_EDITOR_CONTEXT__ = {
        setSelectedElementId,
        updateElementConfig,
        elementConfigs
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__VISUAL_EDITOR_CONTEXT__
      }
    }
  }, [isEditorMode, setSelectedElementId, updateElementConfig, elementConfigs])

  // Listen for text selection events
  React.useEffect(() => {
    if (!isEditorMode) return
    const handleSelect = (e: CustomEvent) => {
      setSelectedElementId(e.detail.elementId)
    }
    window.addEventListener('visual-editor-select', handleSelect as EventListener)
    return () => {
      window.removeEventListener('visual-editor-select', handleSelect as EventListener)
    }
  }, [isEditorMode, setSelectedElementId])

  // Get configs for different elements
  const centerHubConfig = elementConfigs['wheel-center-hub'] || {}
  const sunCircleConfig = elementConfigs['wheel-sun-circle'] || {}
  const weeksCircleConfig = elementConfigs['wheel-weeks-circle'] || {}
  const dayPartsConfig = elementConfigs['wheel-day-parts'] || {}
  const daysCircleConfig = elementConfigs['wheel-days-circle'] || {}

  // Calculate radii with overrides from editor
  const baseRadii = {
    sunOuter: size * 0.48,
    sunInner: size * 0.44,
    leadersOuter: size * 0.43,
    leadersInner: size * 0.36,
    monthDaysOuter: size * 0.35,
    monthDaysInner: size * 0.28,
    weeksOuter: size * 0.27,
    weeksInner: size * 0.22,
    dayPartsOuter: size * 0.21,
    dayPartsInner: size * 0.17,
    daysOuter: size * 0.16,
    daysInner: size * 0.11,
    centerHub: size * 0.08,
  }

  // Apply editor overrides (use useMemo to prevent infinite re-renders)
  const radii = React.useMemo(() => ({
    ...baseRadii,
    sunOuter: sunCircleConfig.radius ?? baseRadii.sunOuter,
    sunInner: sunCircleConfig.innerRadius ?? baseRadii.sunInner,
    weeksOuter: weeksCircleConfig.radius ?? baseRadii.weeksOuter,
    weeksInner: weeksCircleConfig.innerRadius ?? baseRadii.weeksInner,
    dayPartsOuter: dayPartsConfig.radius ?? baseRadii.dayPartsOuter,
    dayPartsInner: dayPartsConfig.innerRadius ?? baseRadii.dayPartsInner,
    daysOuter: daysCircleConfig.radius ?? baseRadii.daysOuter,
    daysInner: daysCircleConfig.innerRadius ?? baseRadii.daysInner,
    centerHub: centerHubConfig.radius ?? baseRadii.centerHub,
  }), [
    baseRadii,
    sunCircleConfig.radius,
    sunCircleConfig.innerRadius,
    weeksCircleConfig.radius,
    weeksCircleConfig.innerRadius,
    dayPartsConfig.radius,
    dayPartsConfig.innerRadius,
    daysCircleConfig.radius,
    daysCircleConfig.innerRadius,
    centerHubConfig.radius
  ])

  // Build custom radii from editor configs (memoized to prevent infinite re-renders)
  const customRadii = React.useMemo(() => {
    if (!isEditorMode) return undefined
    return {
      sunOuter: sunCircleConfig.radius,
      sunInner: sunCircleConfig.innerRadius,
      weeksOuter: weeksCircleConfig.radius,
      weeksInner: weeksCircleConfig.innerRadius,
      dayPartsOuter: dayPartsConfig.radius,
      dayPartsInner: dayPartsConfig.innerRadius,
      daysOuter: daysCircleConfig.radius,
      daysInner: daysCircleConfig.innerRadius,
      centerHub: centerHubConfig.radius,
    }
  }, [
    isEditorMode,
    sunCircleConfig.radius,
    sunCircleConfig.innerRadius,
    weeksCircleConfig.radius,
    weeksCircleConfig.innerRadius,
    dayPartsConfig.radius,
    dayPartsConfig.innerRadius,
    daysCircleConfig.radius,
    daysCircleConfig.innerRadius,
    centerHubConfig.radius
  ])

  // Filter out undefined values (memoized)
  const filteredRadii = React.useMemo(() => {
    if (!customRadii) return undefined
    return Object.fromEntries(
      Object.entries(customRadii).filter(([_, v]) => v !== undefined)
    )
  }, [customRadii])

  // Get ring offsets from configs
  const ringOffsets = useMemo(() => {
    if (!isEditorMode) return undefined
    return {
      sun: { 
        x: sunCircleConfig.x ?? 0, 
        y: sunCircleConfig.y ?? 0 
      },
      leaders: { 
        x: elementConfigs['wheel-leaders-circle']?.x ?? 0, 
        y: elementConfigs['wheel-leaders-circle']?.y ?? 0 
      },
      monthDays: { 
        x: elementConfigs['wheel-month-days']?.x ?? 0, 
        y: elementConfigs['wheel-month-days']?.y ?? 0 
      },
      weeks: { 
        x: weeksCircleConfig.x ?? 0, 
        y: weeksCircleConfig.y ?? 0 
      },
      dayParts: { 
        x: dayPartsConfig.x ?? 0, 
        y: dayPartsConfig.y ?? 0 
      },
      days: { 
        x: daysCircleConfig.x ?? 0, 
        y: daysCircleConfig.y ?? 0 
      },
      centerHub: { 
        x: centerHubConfig.x ?? 0, 
        y: centerHubConfig.y ?? 0 
      },
    }
  }, [
    isEditorMode,
    sunCircleConfig.x, sunCircleConfig.y,
    weeksCircleConfig.x, weeksCircleConfig.y,
    dayPartsConfig.x, dayPartsConfig.y,
    daysCircleConfig.x, daysCircleConfig.y,
    centerHubConfig.x, centerHubConfig.y,
    elementConfigs
  ])

  // Get text overrides from configs
  const textOverrides = useMemo(() => {
    if (!isEditorMode) return undefined
    const overrides: Record<string, string> = {}
    Object.entries(elementConfigs).forEach(([id, config]) => {
      if (config.type === 'text' && config.text) {
        overrides[id] = config.text
      }
    })
    return Object.keys(overrides).length > 0 ? overrides : undefined
  }, [isEditorMode, elementConfigs])

  // If editor mode is off, just render normally
  if (!isEditorMode) {
    return <YHVHWheelCalendar {...props} />
  }

  const center = size / 2

  // In editor mode, wrap with controls
  return (
    <div className="relative">
      <YHVHWheelCalendar 
        {...props} 
        customRadii={filteredRadii}
        ringOffsets={ringOffsets}
        textOverrides={textOverrides}
      />
      
      {/* Editor controls overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Center Hub Control */}
        <DraggableControls
          elementId="wheel-center-hub"
          elementType="circle"
          defaultX={center}
          defaultY={center}
          defaultRadius={baseRadii.centerHub}
          allowDrag={true}
          allowRadiusChange={true}
          onPositionChange={(x, y) => {
            updateElementConfig('wheel-center-hub', { 
              x: x - center, 
              y: y - center, 
              type: 'circle' 
            })
          }}
          onRadiusChange={(radius) => {
            updateElementConfig('wheel-center-hub', { radius, type: 'circle' })
          }}
          className="absolute"
          style={{
            left: `${center + (centerHubConfig.x ?? 0)}px`,
            top: `${center + (centerHubConfig.y ?? 0)}px`,
            transform: 'translate(-50%, -50%)',
            width: `${radii.centerHub * 2}px`,
            height: `${radii.centerHub * 2}px`,
            borderRadius: '50%',
            pointerEvents: 'auto'
          }}
        >
          <div className="w-full h-full border-2 border-dashed border-blue-400 opacity-50" />
        </DraggableControls>

        {/* Sun Circle Control */}
        <DraggableControls
          elementId="wheel-sun-circle"
          elementType="ring"
          defaultX={center}
          defaultY={center}
          defaultRadius={baseRadii.sunOuter}
          allowDrag={true}
          allowRadiusChange={true}
          onPositionChange={(x, y) => {
            updateElementConfig('wheel-sun-circle', { 
              x: x - center, 
              y: y - center, 
              type: 'ring' 
            })
          }}
          onRadiusChange={(radius) => {
            updateElementConfig('wheel-sun-circle', { 
              radius, 
              innerRadius: radii.sunInner,
              type: 'ring' 
            })
          }}
          className="absolute"
          style={{
            left: `${center + (sunCircleConfig.x ?? 0)}px`,
            top: `${center + (sunCircleConfig.y ?? 0)}px`,
            transform: 'translate(-50%, -50%)',
            width: `${radii.sunOuter * 2}px`,
            height: `${radii.sunOuter * 2}px`,
            borderRadius: '50%',
            pointerEvents: 'auto'
          }}
        >
          <div className="w-full h-full border-2 border-dashed border-yellow-400 opacity-50" />
        </DraggableControls>

        {/* Leaders Circle Control */}
        <DraggableControls
          elementId="wheel-leaders-circle"
          elementType="ring"
          defaultX={center}
          defaultY={center}
          defaultRadius={baseRadii.leadersOuter}
          allowDrag={true}
          allowRadiusChange={true}
          onPositionChange={(x, y) => {
            updateElementConfig('wheel-leaders-circle', { 
              x: x - center, 
              y: y - center, 
              type: 'ring' 
            })
          }}
          className="absolute"
          style={{
            left: `${center + (elementConfigs['wheel-leaders-circle']?.x ?? 0)}px`,
            top: `${center + (elementConfigs['wheel-leaders-circle']?.y ?? 0)}px`,
            transform: 'translate(-50%, -50%)',
            width: `${baseRadii.leadersOuter * 2}px`,
            height: `${baseRadii.leadersOuter * 2}px`,
            borderRadius: '50%',
            pointerEvents: 'auto'
          }}
        >
          <div className="w-full h-full border-2 border-dashed border-orange-400 opacity-50" />
        </DraggableControls>

        {/* Month Days Control */}
        <DraggableControls
          elementId="wheel-month-days"
          elementType="ring"
          defaultX={center}
          defaultY={center}
          defaultRadius={baseRadii.monthDaysOuter}
          allowDrag={true}
          allowRadiusChange={true}
          onPositionChange={(x, y) => {
            updateElementConfig('wheel-month-days', { 
              x: x - center, 
              y: y - center, 
              type: 'ring' 
            })
          }}
          className="absolute"
          style={{
            left: `${center + (elementConfigs['wheel-month-days']?.x ?? 0)}px`,
            top: `${center + (elementConfigs['wheel-month-days']?.y ?? 0)}px`,
            transform: 'translate(-50%, -50%)',
            width: `${baseRadii.monthDaysOuter * 2}px`,
            height: `${baseRadii.monthDaysOuter * 2}px`,
            borderRadius: '50%',
            pointerEvents: 'auto'
          }}
        >
          <div className="w-full h-full border-2 border-dashed border-cyan-400 opacity-50" />
        </DraggableControls>

        {/* Weeks Circle Control */}
        <DraggableControls
          elementId="wheel-weeks-circle"
          elementType="ring"
          defaultX={center}
          defaultY={center}
          defaultRadius={baseRadii.weeksOuter}
          allowDrag={true}
          allowRadiusChange={true}
          onPositionChange={(x, y) => {
            updateElementConfig('wheel-weeks-circle', { 
              x: x - center, 
              y: y - center, 
              type: 'ring' 
            })
          }}
          onRadiusChange={(radius) => {
            updateElementConfig('wheel-weeks-circle', { 
              radius, 
              innerRadius: radii.weeksInner,
              type: 'ring' 
            })
          }}
          className="absolute"
          style={{
            left: `${center + (weeksCircleConfig.x ?? 0)}px`,
            top: `${center + (weeksCircleConfig.y ?? 0)}px`,
            transform: 'translate(-50%, -50%)',
            width: `${radii.weeksOuter * 2}px`,
            height: `${radii.weeksOuter * 2}px`,
            borderRadius: '50%',
            pointerEvents: 'auto'
          }}
        >
          <div className="w-full h-full border-2 border-dashed border-green-400 opacity-50" />
        </DraggableControls>

        {/* Day Parts Control */}
        <DraggableControls
          elementId="wheel-day-parts"
          elementType="ring"
          defaultX={center}
          defaultY={center}
          defaultRadius={baseRadii.dayPartsOuter}
          allowDrag={true}
          allowRadiusChange={true}
          onPositionChange={(x, y) => {
            updateElementConfig('wheel-day-parts', { 
              x: x - center, 
              y: y - center, 
              type: 'ring' 
            })
          }}
          className="absolute"
          style={{
            left: `${center + (dayPartsConfig.x ?? 0)}px`,
            top: `${center + (dayPartsConfig.y ?? 0)}px`,
            transform: 'translate(-50%, -50%)',
            width: `${baseRadii.dayPartsOuter * 2}px`,
            height: `${baseRadii.dayPartsOuter * 2}px`,
            borderRadius: '50%',
            pointerEvents: 'auto'
          }}
        >
          <div className="w-full h-full border-2 border-dashed border-pink-400 opacity-50" />
        </DraggableControls>

        {/* Days Circle Control */}
        <DraggableControls
          elementId="wheel-days-circle"
          elementType="ring"
          defaultX={center}
          defaultY={center}
          defaultRadius={baseRadii.daysOuter}
          allowDrag={true}
          allowRadiusChange={true}
          onPositionChange={(x, y) => {
            updateElementConfig('wheel-days-circle', { 
              x: x - center, 
              y: y - center, 
              type: 'ring' 
            })
          }}
          onRadiusChange={(radius) => {
            updateElementConfig('wheel-days-circle', { 
              radius, 
              innerRadius: radii.daysInner,
              type: 'ring' 
            })
          }}
          className="absolute"
          style={{
            left: `${center + (daysCircleConfig.x ?? 0)}px`,
            top: `${center + (daysCircleConfig.y ?? 0)}px`,
            transform: 'translate(-50%, -50%)',
            width: `${radii.daysOuter * 2}px`,
            height: `${radii.daysOuter * 2}px`,
            borderRadius: '50%',
            pointerEvents: 'auto'
          }}
        >
          <div className="w-full h-full border-2 border-dashed border-purple-400 opacity-50" />
        </DraggableControls>
      </div>
    </div>
  )
}

