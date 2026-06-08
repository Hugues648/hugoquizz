/**
 * EntranceElement - Composant pour les entrées de la salle
 * 
 * Fonctionnalités:
 * - Entrée principale avec tapis rouge
 * - Entrées secondaires
 * - Déplaçable, dimensionnable et colorable
 * - Support tactile pour smartphone
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMove, FiTrash2, FiStar } from 'react-icons/fi'

const ENTRANCE_COLORS = [
  '#92400e', // amber-800 (défaut entrée principale)
  '#374151', // gray-700 (défaut entrée secondaire)
  '#7c3aed', // violet-600
  '#dc2626', // red-600
  '#059669', // emerald-600
  '#2563eb', // blue-600
  '#db2777', // pink-600
  '#000000', // noir
]

export default function EntranceElement({
  entrance,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  onSetMain,
  zoom = 1
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 })
  const [initialWidth, setInitialWidth] = useState(80)
  const [isRotating, setIsRotating] = useState(false)
  const [rotateStart, setRotateStart] = useState(0)
  const [initialRotation, setInitialRotation] = useState(0)
  const elementRef = useRef(null)
  const { t } = useTranslation()

  const { 
    id, x, y, width = 80, height = 40, rotation = 0, 
    isMain, hasRedCarpet, label, color 
  } = entrance

  const defaultColor = isMain ? '#92400e' : '#374151'
  const entranceColor = color || defaultColor

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
    setIsResizing(true)
    setResizeHandle(handle)
    setDragStart({ x: clientX, y: 0 })
    setInitialWidth(width)
    setInitialPos({ x, y })
  }, [width, x, y])

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !resizeHandle) return
    
    const clientX = e.clientX || e.touches?.[0]?.clientX
    const dx = (clientX - dragStart.x) / zoom
    
    const minWidth = 50
    const maxWidth = 200
    
    let newWidth = initialWidth
    let newX = initialPos.x
    
    if (resizeHandle === 'e') {
      newWidth = Math.max(minWidth, Math.min(maxWidth, initialWidth + dx * 2))
    } else if (resizeHandle === 'w') {
      newWidth = Math.max(minWidth, Math.min(maxWidth, initialWidth - dx * 2))
    }
    
    onUpdate(id, { width: newWidth })
  }, [isResizing, resizeHandle, dragStart, initialWidth, initialPos, zoom, id, onUpdate])

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

  const carpetHeight = Math.min(100, width * 1.2)

  return (
    <div
      ref={elementRef}
      style={{
        position: 'absolute',
        left: x - width / 2,
        top: y - (isMain && hasRedCarpet ? carpetHeight + 20 : 20),
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center bottom',
        cursor: isRotating ? 'grabbing' : isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging || isSelected || isRotating ? 50 : 20,
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

      {/* Tapis rouge (si entrée principale) */}
      {isMain && hasRedCarpet && (
        <div
          style={{
            width: width * 0.8,
            height: carpetHeight,
            marginLeft: width * 0.1,
            marginBottom: -2
          }}
          className="bg-gradient-to-b from-red-600 to-red-700 rounded-t-sm relative"
        >
          {/* Motif du tapis */}
          <div className="absolute inset-x-2 inset-y-0 border-l-2 border-r-2 border-yellow-400/50" />
          <div className="absolute inset-x-4 top-2 bottom-0 border-l border-r border-yellow-400/30" />
          
          {/* Étoiles décoratives */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-yellow-400 text-xs">✦</div>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-yellow-400/60 text-xs">✦</div>
          <div className="absolute top-2/3 left-1/2 -translate-x-1/2 text-yellow-400/40 text-xs">✦</div>
        </div>
      )}
      
      {/* Porte d'entrée */}
      <div
        style={{ 
          width, 
          height: height || 40,
          backgroundColor: entranceColor
        }}
        className={`relative flex items-center justify-center transition-all rounded-t-sm ${
          isSelected ? 'ring-2 ring-purple-400 ring-offset-2' : ''
        }`}
      >
        {/* Poignées de porte */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-6 bg-yellow-500 rounded" />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-6 bg-yellow-500 rounded" />
        
        {/* Label */}
        <span className="text-white text-xs font-medium px-4 text-center truncate">
          {isMain ? t('seatingPlan.mainEntrance', 'Entrée principale') : t('seatingPlan.entrance', 'Entrée')}
        </span>
        
        {/* Icône déplacement */}
        <div className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity">
          <FiMove className="text-gray-500" size={12} />
        </div>
        
        {/* Badge entrée principale */}
        {isMain && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 rounded-full p-1">
            <FiStar size={10} className="text-yellow-800" />
          </div>
        )}

        {/* Poignées de redimensionnement latérales */}
        {isSelected && (
          <>
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-8 bg-white border-2 border-purple-500 rounded cursor-ew-resize hover:bg-purple-100"
              onMouseDown={(e) => handleResizeStart(e, 'w')}
              onTouchStart={(e) => handleResizeStart(e, 'w')}
            />
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-8 bg-white border-2 border-purple-500 rounded cursor-ew-resize hover:bg-purple-100"
              onMouseDown={(e) => handleResizeStart(e, 'e')}
              onTouchStart={(e) => handleResizeStart(e, 'e')}
            />
          </>
        )}
      </div>
      
      {/* Contrôles (quand sélectionné) */}
      {isSelected && (
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 min-w-max">
          {/* Couleurs */}
          <div className="flex gap-1 mb-2 justify-center">
            {ENTRANCE_COLORS.map(c => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdate(id, { color: c })
                }}
                className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                  entranceColor === c ? 'border-purple-500 scale-110' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex gap-1 justify-center">
            {!isMain && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSetMain(id)
                }}
                className="p-1.5 hover:bg-yellow-100 rounded text-yellow-600"
                title="Définir comme entrée principale"
              >
                <FiStar size={14} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUpdate(id, { hasRedCarpet: !hasRedCarpet })
              }}
              className={`p-1.5 rounded text-xs ${
                hasRedCarpet ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={hasRedCarpet ? 'Retirer le tapis' : 'Ajouter tapis rouge'}
            >
              🎗️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(id)
              }}
              className="p-1.5 hover:bg-red-100 rounded text-red-600"
              title="Supprimer l'entrée"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
