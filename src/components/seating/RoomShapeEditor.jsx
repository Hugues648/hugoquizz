/**
 * RoomShapeEditor - Composant pour éditer la forme de la salle
 * 
 * Permet de:
 * - Dessiner un polygone personnalisé
 * - Ajouter/supprimer des points
 * - Déplacer les points existants
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { 
  FiEdit2, FiCheck, FiX, FiPlus, FiTrash2, FiCornerDownRight,
  FiSquare, FiOctagon
} from 'react-icons/fi'

const PRESET_SHAPES = {
  rectangle: {
    label: 'Rectangle',
    icon: FiSquare,
    getPoints: (width, height, margin = 50) => [
      { x: margin, y: margin },
      { x: width - margin, y: margin },
      { x: width - margin, y: height - margin },
      { x: margin, y: height - margin }
    ]
  },
  lShape: {
    label: 'Forme L',
    icon: FiCornerDownRight,
    getPoints: (width, height, margin = 50) => [
      { x: margin, y: margin },
      { x: width * 0.6, y: margin },
      { x: width * 0.6, y: height * 0.5 },
      { x: width - margin, y: height * 0.5 },
      { x: width - margin, y: height - margin },
      { x: margin, y: height - margin }
    ]
  },
  octagon: {
    label: 'Octogone',
    icon: FiOctagon,
    getPoints: (width, height, margin = 50) => {
      const cx = width / 2
      const cy = height / 2
      const rx = (width - margin * 2) / 2
      const ry = (height - margin * 2) / 2
      const points = []
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 8) + (i * Math.PI / 4)
        points.push({
          x: cx + rx * Math.cos(angle),
          y: cy + ry * Math.sin(angle)
        })
      }
      return points
    }
  }
}

export default function RoomShapeEditor({
  canvasWidth,
  canvasHeight,
  roomShape,
  onUpdateShape,
  zoom = 1,
  offset = { x: 0, y: 0 }
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)
  const [instructionsPosition, setInstructionsPosition] = useState({ x: 16, y: null }) // y: null = bottom
  const [isDraggingInstructions, setIsDraggingInstructions] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const instructionsRef = useRef(null)

  const points = roomShape?.points || PRESET_SHAPES.rectangle.getPoints(canvasWidth, canvasHeight)

  // Convertir les coordonnées souris en coordonnées canvas
  const getCanvasCoordinates = useCallback((e) => {
    if (!containerRef.current) return { x: 0, y: 0 }
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - offset.x) / zoom
    const y = (e.clientY - rect.top - offset.y) / zoom
    
    return { x, y }
  }, [zoom, offset])

  // Déplacer un point
  const handlePointDrag = useCallback((e) => {
    if (!isDragging || selectedPoint === null) return
    
    const coords = getCanvasCoordinates(e)
    
    // Contraindre aux limites du canvas
    const newX = Math.max(10, Math.min(canvasWidth - 10, coords.x))
    const newY = Math.max(10, Math.min(canvasHeight - 10, coords.y))
    
    const newPoints = [...points]
    newPoints[selectedPoint] = { x: newX, y: newY }
    
    onUpdateShape({ points: newPoints, type: 'polygon' })
  }, [isDragging, selectedPoint, points, canvasWidth, canvasHeight, getCanvasCoordinates, onUpdateShape])

  // Ajouter un nouveau point sur un segment
  const handleAddPoint = useCallback((segmentIndex, e) => {
    e.stopPropagation()
    
    const coords = getCanvasCoordinates(e)
    const newPoints = [...points]
    newPoints.splice(segmentIndex + 1, 0, coords)
    
    onUpdateShape({ points: newPoints, type: 'polygon' })
  }, [points, getCanvasCoordinates, onUpdateShape])

  // Supprimer un point
  const handleRemovePoint = useCallback((index) => {
    if (points.length <= 3) return // Minimum 3 points pour un polygone
    
    const newPoints = points.filter((_, i) => i !== index)
    onUpdateShape({ points: newPoints, type: 'polygon' })
    setSelectedPoint(null)
  }, [points, onUpdateShape])

  // Appliquer une forme prédéfinie
  const applyPreset = useCallback((presetKey) => {
    const preset = PRESET_SHAPES[presetKey]
    if (preset) {
      const newPoints = preset.getPoints(canvasWidth, canvasHeight)
      onUpdateShape({ points: newPoints, type: 'polygon' })
    }
    setShowPresets(false)
  }, [canvasWidth, canvasHeight, onUpdateShape])

  // Event listeners
  useEffect(() => {
    if (!isEditing) return
    
    const handleMouseMove = (e) => handlePointDrag(e)
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isEditing, handlePointDrag])

  // Générer le path SVG du polygone
  const pathD = points.length > 0
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`
    : ''

  return (
    <>
      {/* Toolbar pour l'édition de la forme */}
      <div className="absolute top-4 left-4 z-20 flex gap-2">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow hover:bg-gray-50 text-sm font-medium text-gray-700"
            title="Modifier la forme de la salle"
          >
            <FiEdit2 size={16} />
            Éditer la salle
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 text-sm font-medium"
            >
              <FiCheck size={16} />
              Terminer
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                <FiSquare size={16} />
                Formes
              </button>
              
              {showPresets && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border p-2 min-w-[150px]">
                  {Object.entries(PRESET_SHAPES).map(([key, { label, icon: Icon }]) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left"
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay SVG pour le polygone de la salle */}
      <svg
        ref={containerRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          width: canvasWidth,
          height: canvasHeight
        }}
      >
        {/* Polygone de la salle */}
        <path
          d={pathD}
          fill={roomShape?.fillColor || '#f9fafb'}
          fillOpacity={roomShape?.fillOpacity || 0.3}
          stroke={roomShape?.strokeColor || '#374151'}
          strokeWidth={roomShape?.strokeWidth || 3}
          strokeLinejoin="round"
          className={isEditing ? 'pointer-events-auto cursor-crosshair' : ''}
          onClick={(e) => {
            if (isEditing && e.target === e.currentTarget) {
              // Clic sur le bord pour ajouter un point
              // Trouver le segment le plus proche
              const coords = getCanvasCoordinates(e)
              let minDist = Infinity
              let closestSegment = 0
              
              for (let i = 0; i < points.length; i++) {
                const p1 = points[i]
                const p2 = points[(i + 1) % points.length]
                
                // Distance point-segment
                const dx = p2.x - p1.x
                const dy = p2.y - p1.y
                const t = Math.max(0, Math.min(1, 
                  ((coords.x - p1.x) * dx + (coords.y - p1.y) * dy) / (dx * dx + dy * dy)
                ))
                const projX = p1.x + t * dx
                const projY = p1.y + t * dy
                const dist = Math.sqrt((coords.x - projX) ** 2 + (coords.y - projY) ** 2)
                
                if (dist < minDist) {
                  minDist = dist
                  closestSegment = i
                }
              }
              
              if (minDist < 30) {
                handleAddPoint(closestSegment, e)
              }
            }
          }}
        />

        {/* Points de contrôle en mode édition */}
        {isEditing && points.map((point, index) => (
          <g key={index} className="pointer-events-auto">
            {/* Point de contrôle */}
            <circle
              cx={point.x}
              cy={point.y}
              r={selectedPoint === index ? 10 : 8}
              fill={selectedPoint === index ? '#8B5CF6' : '#3B82F6'}
              stroke="white"
              strokeWidth={2}
              className="cursor-move transition-all"
              onMouseDown={(e) => {
                e.stopPropagation()
                setSelectedPoint(index)
                setIsDragging(true)
              }}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedPoint(selectedPoint === index ? null : index)
              }}
            />
            
            {/* Bouton de suppression */}
            {selectedPoint === index && points.length > 3 && (
              <g
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemovePoint(index)
                }}
              >
                <circle
                  cx={point.x + 15}
                  cy={point.y - 15}
                  r={10}
                  fill="#EF4444"
                  stroke="white"
                  strokeWidth={2}
                />
                <text
                  x={point.x + 15}
                  y={point.y - 11}
                  textAnchor="middle"
                  fill="white"
                  fontSize={12}
                  fontWeight="bold"
                >
                  ×
                </text>
              </g>
            )}
            
            {/* Numéro du point */}
            <text
              x={point.x}
              y={point.y + 4}
              textAnchor="middle"
              fill="white"
              fontSize={10}
              fontWeight="bold"
              className="pointer-events-none"
            >
              {index + 1}
            </text>
          </g>
        ))}

        {/* Indicateur pour ajouter des points (sur les segments) */}
        {isEditing && points.map((point, index) => {
          const nextPoint = points[(index + 1) % points.length]
          const midX = (point.x + nextPoint.x) / 2
          const midY = (point.y + nextPoint.y) / 2
          
          return (
            <circle
              key={`add-${index}`}
              cx={midX}
              cy={midY}
              r={6}
              fill="#10B981"
              fillOpacity={0.6}
              stroke="white"
              strokeWidth={1}
              className="pointer-events-auto cursor-crosshair opacity-0 hover:opacity-100 transition-opacity"
              onClick={(e) => handleAddPoint(index, e)}
            />
          )
        })}
      </svg>

      {/* Instructions en mode édition - déplaçable et fermable */}
      {isEditing && showInstructions && (
        <div 
          ref={instructionsRef}
          className="absolute z-20 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 max-w-xs cursor-move select-none"
          style={{
            left: instructionsPosition.x,
            ...(instructionsPosition.y !== null 
              ? { top: instructionsPosition.y } 
              : { bottom: 16 })
          }}
          onMouseDown={(e) => {
            if (e.target.closest('button')) return
            setIsDraggingInstructions(true)
            const rect = instructionsRef.current.getBoundingClientRect()
            setDragOffset({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
            })
          }}
          onMouseMove={(e) => {
            if (!isDraggingInstructions) return
            const container = containerRef.current?.parentElement
            if (!container) return
            const containerRect = container.getBoundingClientRect()
            const newX = e.clientX - containerRect.left - dragOffset.x
            const newY = e.clientY - containerRect.top - dragOffset.y
            setInstructionsPosition({
              x: Math.max(0, Math.min(newX, containerRect.width - 280)),
              y: Math.max(0, Math.min(newY, containerRect.height - 150))
            })
          }}
          onMouseUp={() => setIsDraggingInstructions(false)}
          onMouseLeave={() => setIsDraggingInstructions(false)}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-800 text-sm">Mode édition de salle</h4>
            <button
              onClick={() => setShowInstructions(false)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Fermer"
            >
              <FiX size={14} className="text-gray-500" />
            </button>
          </div>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• <strong>Glisser</strong> les points bleus pour modifier la forme</li>
            <li>• <strong>Cliquer</strong> sur un segment pour ajouter un point</li>
            <li>• <strong>Sélectionner</strong> un point puis × pour le supprimer</li>
            <li>• Utilisez "Formes" pour des modèles prédéfinis</li>
          </ul>
          <p className="text-xs text-gray-400 mt-2 italic">Glissez ce panneau pour le déplacer</p>
        </div>
      )}
      
      {/* Bouton pour réafficher les instructions si fermées */}
      {isEditing && !showInstructions && (
        <button
          onClick={() => setShowInstructions(true)}
          className="absolute bottom-4 left-4 z-20 p-2 bg-white/90 backdrop-blur rounded-lg shadow hover:bg-white transition-colors"
          title="Afficher les instructions"
        >
          <FiEdit2 size={16} className="text-gray-600" />
        </button>
      )}
    </>
  )
}
