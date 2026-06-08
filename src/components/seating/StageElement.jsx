/**
 * StageElement - Composant pour la scène (Bühne)
 * 
 * Fonctionnalités:
 * - Déplaçable et redimensionnable
 * - Colorable
 * - Permet le placement de tables dessus (table d'honneur)
 * - Support tactile pour smartphone
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMove, FiTrash2, FiMaximize2 } from 'react-icons/fi'

const STAGE_COLORS = [
  '#fef3c7', // amber-100 (défaut)
  '#fee2e2', // red-100
  '#dbeafe', // blue-100
  '#d1fae5', // emerald-100
  '#f3e8ff', // purple-100
  '#fce7f3', // pink-100
  '#e5e7eb', // gray-200
  '#1f2937', // gray-800 (sombre)
]

export default function StageElement({
  stage,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  zoom = 1
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 })
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })
  const [isRotating, setIsRotating] = useState(false)
  const [rotateStart, setRotateStart] = useState(0)
  const [initialRotation, setInitialRotation] = useState(0)
  const elementRef = useRef(null)
  const { t } = useTranslation()

  const { id, x, y, width, height, rotation = 0, label, allowTablesOnTop, color } = stage
  const stageColor = color || '#fef3c7'
  const isDark = stageColor === '#1f2937'

  // ==================== DRAG HANDLERS ====================

  const handleDragStart = useCallback((e) => {
    e.stopPropagation()
    const clientX = e.clientX || e.touches?.[0]?.clientX
    const clientY = e.clientY || e.touches?.[0]?.clientY
    setIsDragging(true)
    setDragStart({ x: clientX, y: clientY })
    setInitialPos({ x, y })
  }, [x, y])

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return
    
    const clientX = e.clientX || e.touches?.[0]?.clientX
    const clientY = e.clientY || e.touches?.[0]?.clientY
    const dx = (clientX - dragStart.x) / zoom
    const dy = (clientY - dragStart.y) / zoom
    
    onUpdate(id, {
      x: initialPos.x + dx,
      y: initialPos.y + dy
    })
  }, [isDragging, dragStart, initialPos, zoom, id, onUpdate])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // ==================== RESIZE HANDLERS ====================

  const handleResizeStart = useCallback((e, handle) => {
    e.stopPropagation()
    const clientX = e.clientX || e.touches?.[0]?.clientX
    const clientY = e.clientY || e.touches?.[0]?.clientY
    setIsResizing(true)
    setResizeHandle(handle)
    setDragStart({ x: clientX, y: clientY })
    setInitialSize({ width, height })
    setInitialPos({ x, y })
  }, [width, height, x, y])

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !resizeHandle) return
    
    const clientX = e.clientX || e.touches?.[0]?.clientX
    const clientY = e.clientY || e.touches?.[0]?.clientY
    const dx = (clientX - dragStart.x) / zoom
    const dy = (clientY - dragStart.y) / zoom
    
    const minWidth = 150
    const minHeight = 80
    const maxWidth = 800
    const maxHeight = 400
    
    let newWidth = initialSize.width
    let newHeight = initialSize.height
    let newX = initialPos.x
    let newY = initialPos.y
    
    if (resizeHandle.includes('e')) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, initialSize.width + dx))
    }
    if (resizeHandle.includes('w')) {
      const widthChange = initialSize.width - Math.max(minWidth, Math.min(maxWidth, initialSize.width - dx))
      newWidth = initialSize.width - widthChange
      newX = initialPos.x + widthChange
    }
    if (resizeHandle.includes('s')) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, initialSize.height + dy))
    }
    if (resizeHandle.includes('n')) {
      const heightChange = initialSize.height - Math.max(minHeight, Math.min(maxHeight, initialSize.height - dy))
      newHeight = initialSize.height - heightChange
      newY = initialPos.y + heightChange
    }
    
    onUpdate(id, { width: newWidth, height: newHeight, x: newX, y: newY })
  }, [isResizing, resizeHandle, dragStart, initialSize, initialPos, zoom, id, onUpdate])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // ==================== GLOBAL LISTENERS ====================

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e) => handleDragMove(e)
      const handleEnd = () => handleDragEnd()
      
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
      
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  useEffect(() => {
    if (isResizing) {
      const handleMove = (e) => handleResizeMove(e)
      const handleEnd = () => handleResizeEnd()
      
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
      
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // ==================== ROTATION HANDLERS (Canva-style) ====================

  const getElementCenter = useCallback(() => {
    if (!elementRef.current) return { x: 0, y: 0 }
    const rect = elementRef.current.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    }
  }, [])

  const handleRotateStart = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    const clientX = e.clientX || e.touches?.[0]?.clientX
    const clientY = e.clientY || e.touches?.[0]?.clientY
    const center = getElementCenter()
    const startAngle = Math.atan2(clientY - center.y, clientX - center.x) * (180 / Math.PI)
    setIsRotating(true)
    setRotateStart(startAngle)
    setInitialRotation(rotation)
  }, [rotation, getElementCenter])

  const handleRotateMove = useCallback((e) => {
    if (!isRotating) return
    const clientX = e.clientX || e.touches?.[0]?.clientX
    const clientY = e.clientY || e.touches?.[0]?.clientY
    const center = getElementCenter()
    const currentAngle = Math.atan2(clientY - center.y, clientX - center.x) * (180 / Math.PI)
    let delta = currentAngle - rotateStart
    let newRotation = (initialRotation + delta) % 360
    if (newRotation < 0) newRotation += 360
    const snapped = Math.round(newRotation / 15) * 15
    if (Math.abs(newRotation - snapped) < 5) newRotation = snapped
    onUpdate(id, { rotation: Math.round(newRotation) })
  }, [isRotating, rotateStart, initialRotation, id, onUpdate, getElementCenter])

  const handleRotateEnd = useCallback(() => {
    setIsRotating(false)
  }, [])

  useEffect(() => {
    if (isRotating) {
      const handleMove = (e) => handleRotateMove(e)
      const handleEnd = () => handleRotateEnd()
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isRotating, handleRotateMove, handleRotateEnd])

  // ==================== RENDER ====================

  const resizeHandles = [
    { position: 'nw', cursor: 'nw-resize', top: -4, left: -4 },
    { position: 'ne', cursor: 'ne-resize', top: -4, right: -4 },
    { position: 'se', cursor: 'se-resize', bottom: -4, right: -4 },
    { position: 'sw', cursor: 'sw-resize', bottom: -4, left: -4 }
  ]

  return (
    <div
      ref={elementRef}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        cursor: isRotating ? 'grabbing' : isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging || isSelected || isRotating ? 40 : 5,
        touchAction: 'none'
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
      className="group"
    >
      {/* Canva-style rotation handle */}
      {isSelected && !isDragging && (
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center" style={{ top: -44 }}>
          <div
            className="w-7 h-7 bg-white border-2 border-purple-500 rounded-full cursor-grab hover:bg-purple-100 hover:scale-110 flex items-center justify-center shadow-md active:cursor-grabbing transition-transform"
            onMouseDown={handleRotateStart}
            onTouchStart={handleRotateStart}
            title={`${rotation}°`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-9-9" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </div>
          <div className="w-px h-4 bg-purple-400" />
        </div>
      )}

      {/* Corps de la scène */}
      <div
        className={`w-full h-full relative transition-all ${
          isSelected ? 'ring-2 ring-purple-400 ring-offset-2' : ''
        }`}
      >
        {/* Fond de scène */}
        <div 
          className="absolute inset-0 rounded-lg shadow-lg border-2"
          style={{ 
            backgroundColor: stageColor,
            borderColor: isDark ? '#374151' : '#d97706'
          }}
        >
          {/* Effet de plancher en bois */}
          <div className="absolute inset-2 rounded opacity-20">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`h-full border-r ${isDark ? 'border-gray-600' : 'border-amber-600'}`}
                style={{ 
                  position: 'absolute',
                  left: `${(i + 1) * 12.5}%`,
                  top: 0,
                  bottom: 0
                }}
              />
            ))}
          </div>
          
          {/* Bord de scène (avant) */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-4 rounded-b-lg"
            style={{ 
              background: isDark 
                ? 'linear-gradient(to bottom, #374151, #111827)' 
                : 'linear-gradient(to bottom, #b45309, #78350f)'
            }}
          />
          
          {/* Label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className="font-bold text-lg drop-shadow"
              style={{ color: isDark ? '#f3f4f6' : '#78350f' }}
            >
              {t('seatingPlan.stage', 'Scène')}
            </span>
          </div>
          
          {/* Indicateur de placement de tables */}
          {allowTablesOnTop && (
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500/80 rounded text-white text-xs">
              Tables OK
            </div>
          )}
        </div>
        
        {/* Icône de déplacement */}
        <div className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity">
          <FiMove className="text-gray-500" size={14} />
        </div>
      </div>

      {/* Poignées de redimensionnement */}
      {isSelected && !isDragging && (
        <>
          {resizeHandles.map(({ position, cursor, ...style }) => (
            <div
              key={position}
              className="absolute w-4 h-4 bg-white border-2 border-amber-500 rounded-sm hover:bg-amber-100 transition-colors"
              style={{ cursor, ...style }}
              onMouseDown={(e) => handleResizeStart(e, position)}
              onTouchStart={(e) => handleResizeStart(e, position)}
            />
          ))}
        </>
      )}

      {/* Contrôles (quand sélectionné) */}
      {isSelected && (
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 min-w-max">
          {/* Couleurs */}
          <div className="flex gap-1 mb-2 justify-center">
            {STAGE_COLORS.map(c => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdate(id, { color: c })
                }}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                  stageColor === c ? 'border-purple-500 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex gap-1 justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUpdate(id, { allowTablesOnTop: !allowTablesOnTop })
              }}
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                allowTablesOnTop 
                  ? 'bg-green-100 text-green-600' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={allowTablesOnTop ? 'Tables autorisées' : 'Tables interdites'}
            >
              <FiMaximize2 size={14} />
              <span className="text-xs">Tables</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(id)
              }}
              className="p-1.5 hover:bg-red-100 rounded text-red-600"
              title="Supprimer la scène"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
