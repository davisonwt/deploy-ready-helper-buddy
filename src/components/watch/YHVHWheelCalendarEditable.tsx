import React from 'react'
import { YHVHWheelCalendar } from './YHVHWheelCalendar'
import { useVisualEditor } from '@/contexts/VisualEditorContext'
import { DraggableControls } from '../visual-editor/DraggableControls'

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
  const { isEditorMode, elementConfigs, updateElementConfig } = useVisualEditor()
  const { size = 800 } = props

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

  // If editor mode is off, just render normally
  if (!isEditorMode) {
    return <YHVHWheelCalendar {...props} />
  }

  // In editor mode, wrap with controls
  return (
    <div className="relative">
      <YHVHWheelCalendar {...props} customRadii={filteredRadii} />
      
      {/* Editor controls overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Center Hub Control */}
        <DraggableControls
          elementId="wheel-center-hub"
          elementType="circle"
          defaultRadius={baseRadii.centerHub}
          allowRadiusChange={true}
          onRadiusChange={(radius) => {
            updateElementConfig('wheel-center-hub', { radius, type: 'circle' })
          }}
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
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
          defaultRadius={baseRadii.sunOuter}
          allowRadiusChange={true}
          onRadiusChange={(radius) => {
            updateElementConfig('wheel-sun-circle', { 
              radius, 
              innerRadius: radii.sunInner,
              type: 'ring' 
            })
          }}
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${radii.sunOuter * 2}px`,
            height: `${radii.sunOuter * 2}px`,
            borderRadius: '50%',
            pointerEvents: 'auto'
          }}
        >
          <div className="w-full h-full border-2 border-dashed border-yellow-400 opacity-50" />
        </DraggableControls>

        {/* Weeks Circle Control */}
        <DraggableControls
          elementId="wheel-weeks-circle"
          elementType="ring"
          defaultRadius={baseRadii.weeksOuter}
          allowRadiusChange={true}
          onRadiusChange={(radius) => {
            updateElementConfig('wheel-weeks-circle', { 
              radius, 
              innerRadius: radii.weeksInner,
              type: 'ring' 
            })
          }}
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${radii.weeksOuter * 2}px`,
            height: `${radii.weeksOuter * 2}px`,
            borderRadius: '50%',
            pointerEvents: 'auto'
          }}
        >
          <div className="w-full h-full border-2 border-dashed border-green-400 opacity-50" />
        </DraggableControls>

        {/* Days Circle Control */}
        <DraggableControls
          elementId="wheel-days-circle"
          elementType="ring"
          defaultRadius={baseRadii.daysOuter}
          allowRadiusChange={true}
          onRadiusChange={(radius) => {
            updateElementConfig('wheel-days-circle', { 
              radius, 
              innerRadius: radii.daysInner,
              type: 'ring' 
            })
          }}
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
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

