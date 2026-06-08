/**
 * DraggableTable - Composant pour une table déplaçable et redimensionnable
 * 
 * Fonctionnalités:
 * - Drag & drop
 * - Redimensionnement avec poignées
 * - Rotation
 * - Différentes formes (ronde, rectangulaire, carrée, personnalisée)
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { FiMove, FiMaximize2, FiRotateCw } from 'react-icons/fi'

export default function DraggableTable({
  table,
  position,
  guests = [],
  isSelected,
  onSelect,
  onPositionChange,
  onSizeChange,
  onRotationChange,
  onGuestDrop,
  zoom = 1,
  constrainToRoom,
  showGuestInitials = true
}) {
  const tableRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 })
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })

  const { x, y, width, height, shape, color, rotation = 0 } = position || {
    x: 100,
    y: 100,
    width: 140,
    height: 140,
    shape: 'round',
    color: '#8B5CF6',
    rotation: 0
  }

  const guestCount = guests.reduce((acc, g) => 
    acc + (g.ticketType === 'couple' ? 2 : 1), 0
  )
  const isOver = guestCount > table.capacity
  const isFull = guestCount >= table.capacity

  // ==================== DRAG HANDLERS ====================

  const handleDragStart = useCallback((e) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setInitialPos({ x, y })
  }, [x, y])

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return
    
    const dx = (e.clientX - dragStart.x) / zoom
    const dy = (e.clientY - dragStart.y) / zoom
    
    let newX = initialPos.x + dx
    let newY = initialPos.y + dy
    
    // Contraindre aux limites si fonction fournie
    if (constrainToRoom) {
      const constrained = constrainToRoom(newX, newY, width, height)
      newX = constrained.x
      newY = constrained.y
    }
    
    onPositionChange(table.id, newX, newY)
  }, [isDragging, dragStart, initialPos, zoom, width, height, table.id, onPositionChange, constrainToRoom])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // ==================== RESIZE HANDLERS ====================

  const handleResizeStart = useCallback((e, handle) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setDragStart({ x: e.clientX, y: e.clientY })
    setInitialSize({ width, height })
    setInitialPos({ x, y })
  }, [width, height, x, y])

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !resizeHandle) return
    
    const dx = (e.clientX - dragStart.x) / zoom
    const dy = (e.clientY - dragStart.y) / zoom
    
    let newWidth = initialSize.width
    let newHeight = initialSize.height
    let newX = initialPos.x
    let newY = initialPos.y
    
    const minSize = 60
    const maxSize = 400
    
    // Appliquer le redimensionnement selon la poignée
    if (resizeHandle.includes('e')) {
      newWidth = Math.max(minSize, Math.min(maxSize, initialSize.width + dx))
    }
    if (resizeHandle.includes('w')) {
      const widthChange = Math.max(minSize, Math.min(maxSize, initialSize.width - dx)) - initialSize.width
      newWidth = initialSize.width + Math.abs(widthChange)
      newX = initialPos.x - widthChange
    }
    if (resizeHandle.includes('s')) {
      newHeight = Math.max(minSize, Math.min(maxSize, initialSize.height + dy))
    }
    if (resizeHandle.includes('n')) {
      const heightChange = Math.max(minSize, Math.min(maxSize, initialSize.height - dy)) - initialSize.height
      newHeight = initialSize.height + Math.abs(heightChange)
      newY = initialPos.y - heightChange
    }
    
    // Pour les formes rondes et carrées, garder le ratio 1:1
    if (shape === 'round' || shape === 'square') {
      const size = Math.max(newWidth, newHeight)
      newWidth = size
      newHeight = size
    }
    
    onSizeChange(table.id, newWidth, newHeight)
    if (newX !== initialPos.x || newY !== initialPos.y) {
      onPositionChange(table.id, newX, newY)
    }
  }, [isResizing, resizeHandle, dragStart, initialSize, initialPos, zoom, shape, table.id, onSizeChange, onPositionChange])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // ==================== TOUCH HANDLERS ====================

  const handleTouchStart = useCallback((e) => {
    e.stopPropagation()
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({ x: touch.clientX, y: touch.clientY })
    setInitialPos({ x, y })
  }, [x, y])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return
    e.preventDefault()
    
    const touch = e.touches[0]
    const dx = (touch.clientX - dragStart.x) / zoom
    const dy = (touch.clientY - dragStart.y) / zoom
    
    let newX = initialPos.x + dx
    let newY = initialPos.y + dy
    
    if (constrainToRoom) {
      const constrained = constrainToRoom(newX, newY, width, height)
      newX = constrained.x
      newY = constrained.y
    }
    
    onPositionChange(table.id, newX, newY)
  }, [isDragging, dragStart, initialPos, zoom, width, height, table.id, onPositionChange, constrainToRoom])

  // ==================== GLOBAL EVENT LISTENERS ====================

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e) => handleDragMove(e)
      const handleEnd = () => handleDragEnd()
      
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
      
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd, handleTouchMove])

  useEffect(() => {
    if (isResizing) {
      const handleMove = (e) => handleResizeMove(e)
      const handleEnd = () => handleResizeEnd()
      
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleEnd)
      
      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])

  // ==================== DROP HANDLERS ====================

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const guestId = e.dataTransfer.getData('guestId')
    if (guestId && onGuestDrop) {
      onGuestDrop(guestId, table.id, table.name)
    }
  }

  // ==================== RENDER ====================

  const getShapeStyles = () => {
    switch (shape) {
      case 'round':
        return 'rounded-full'
      case 'square':
        return 'rounded-xl'
      case 'rectangle':
        return 'rounded-xl'
      default:
        return 'rounded-xl'
    }
  }

  // Poignées de redimensionnement
  const resizeHandles = [
    { position: 'nw', cursor: 'nw-resize', top: -4, left: -4 },
    { position: 'n', cursor: 'n-resize', top: -4, left: '50%', transform: 'translateX(-50%)' },
    { position: 'ne', cursor: 'ne-resize', top: -4, right: -4 },
    { position: 'e', cursor: 'e-resize', top: '50%', right: -4, transform: 'translateY(-50%)' },
    { position: 'se', cursor: 'se-resize', bottom: -4, right: -4 },
    { position: 's', cursor: 's-resize', bottom: -4, left: '50%', transform: 'translateX(-50%)' },
    { position: 'sw', cursor: 'sw-resize', bottom: -4, left: -4 },
    { position: 'w', cursor: 'w-resize', top: '50%', left: -4, transform: 'translateY(-50%)' }
  ]

  return (
    <div
      ref={tableRef}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        zIndex: isDragging || isSelected ? 100 : 10
      }}
      onMouseDown={handleDragStart}
      onTouchStart={handleTouchStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(table.id)
      }}
      className="group"
    >
      {/* Corps de la table */}
      <div
        className={`w-full h-full flex items-center justify-center shadow-lg transition-all ${getShapeStyles()} ${
          isSelected 
            ? 'ring-4 ring-purple-400 ring-offset-2' 
            : 'hover:ring-2 hover:ring-purple-300'
        }`}
        style={{ backgroundColor: color }}
      >
        {/* Nom et compteur */}
        <div 
          className="text-center text-white pointer-events-none overflow-hidden px-1"
          style={{ maxWidth: width * 0.85, maxHeight: height * 0.85 }}
        >
          <p 
            className="font-bold drop-shadow leading-tight break-words"
            style={{ fontSize: Math.max(8, Math.min(18, Math.min(width, height) * 0.13)) }}
          >
            {table.name}
          </p>
          <p 
            className={`${isOver ? 'text-red-200' : 'text-white/80'} leading-tight`}
            style={{ fontSize: Math.max(7, Math.min(14, Math.min(width, height) * 0.1)) }}
          >
            {guestCount}/{table.capacity}
          </p>
        </div>
        
        {/* Indicateur de déplacement */}
        <div className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <FiMove className="text-gray-500" size={14} />
        </div>

        {/* Badge de statut */}
        {isFull && (
          <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-medium ${
            isOver ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}>
            {isOver ? 'Surcharge' : 'Complet'}
          </div>
        )}
      </div>

      {/* Poignées de redimensionnement (visibles quand sélectionné) */}
      {isSelected && !isDragging && (
        <>
          {resizeHandles.map(({ position, cursor, ...style }) => (
            <div
              key={position}
              className="absolute w-3 h-3 bg-white border-2 border-purple-500 rounded-sm hover:bg-purple-100 transition-colors"
              style={{
                cursor,
                ...style
              }}
              onMouseDown={(e) => handleResizeStart(e, position)}
            />
          ))}
          
          {/* Bouton de rotation */}
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 p-1.5 bg-white rounded-full shadow cursor-pointer hover:bg-gray-100"
            onMouseDown={(e) => {
              e.stopPropagation()
              // Rotation par incréments de 15 degrés
              const newRotation = ((rotation || 0) + 15) % 360
              onRotationChange?.(table.id, newRotation)
            }}
          >
            <FiRotateCw size={14} className="text-gray-600" />
          </div>
        </>
      )}

      {/* Invités autour de la table */}
      {showGuestInitials && (
      <div className="absolute inset-0 pointer-events-none">
        {guests.map((guest, idx) => {
          const totalGuests = guests.length
          const angle = (360 / Math.max(totalGuests, 1)) * idx - 90
          const radius = Math.min(width, height) / 2 + 25
          const centerX = width / 2
          const centerY = height / 2
          const guestX = centerX + radius * Math.cos(angle * Math.PI / 180) - 18
          const guestY = centerY + radius * Math.sin(angle * Math.PI / 180) - 18
          
          return (
            <div
              key={guest.id}
              className="absolute w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-xs font-bold text-purple-600 border-2 border-purple-200"
              style={{ 
                left: guestX, 
                top: guestY,
                transform: `rotate(${-rotation}deg)` // Contre-rotation pour garder le texte lisible
              }}
              title={`${guest.firstName} ${guest.lastName}${guest.ticketType === 'couple' ? ` + ${guest.spouseFirstName}` : ''}`}
            >
              {guest.firstName?.[0]}{guest.lastName?.[0]}
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
