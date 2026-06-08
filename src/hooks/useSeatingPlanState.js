/**
 * useSeatingPlanState - Hook centralisé pour la gestion d'état du plan de salle
 * 
 * Architecture de données:
 * - roomLayout: Configuration de la salle (forme, dimensions, entrées, scènes)
 * - tables: Positions et propriétés des tables
 * - Sauvegarde automatique et persistance complète
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  getTablesByEvent, 
  updateTable, 
  getRoomLayout, 
  saveRoomLayout 
} from '../services/firestore'
import toast from 'react-hot-toast'

// ==================== CONSTANTES ====================

export const TABLE_SHAPES = {
  round: { label: 'Ronde', width: 140, height: 140 },
  rectangle: { label: 'Rectangle', width: 180, height: 100 },
  square: { label: 'Carrée', width: 120, height: 120 },
  custom: { label: 'Personnalisée', width: 150, height: 100 }
}

export const TABLE_COLORS = [
  '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', 
  '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]

// Structure de données par défaut pour la salle
export const DEFAULT_ROOM_LAYOUT = {
  // Dimensions du canvas
  canvasWidth: 1200,
  canvasHeight: 800,
  
  // Niveau de zoom actuel
  zoom: 1,
  
  // Décalage du pan
  offsetX: 0,
  offsetY: 0,
  
  // Forme de la salle (polygone personnalisable)
  // Points définis en coordonnées relatives au canvas
  roomShape: {
    type: 'rectangle', // 'rectangle', 'polygon', 'custom'
    // Points du polygone (pour forme custom)
    points: [
      { x: 50, y: 50 },
      { x: 1150, y: 50 },
      { x: 1150, y: 750 },
      { x: 50, y: 750 }
    ],
    // Style du cadre
    strokeColor: '#374151',
    strokeWidth: 3,
    fillColor: '#f9fafb',
    fillOpacity: 0.5
  },
  
  // Entrées de la salle
  entrances: [
    // {
    //   id: 'entrance-1',
    //   x: 600,
    //   y: 750,
    //   width: 80,
    //   rotation: 0,
    //   isMain: true,
    //   hasRedCarpet: true,
    //   label: 'Entrée principale'
    // }
  ],
  
  // Scènes
  stages: [
    // {
    //   id: 'stage-1',
    //   x: 100,
    //   y: 100,
    //   width: 400,
    //   height: 150,
    //   rotation: 0,
    //   label: 'Scène',
    //   allowTablesOnTop: true
    // }
  ]
}

// Structure de données par défaut pour une table
export const createDefaultTablePosition = (table, index) => {
  const shape = table.shape || 'round'
  const defaultShape = TABLE_SHAPES[shape] || TABLE_SHAPES.round
  
  return {
    x: table.posX !== undefined ? table.posX : (150 + (index % 4) * 220),
    y: table.posY !== undefined ? table.posY : (150 + Math.floor(index / 4) * 220),
    width: table.width !== undefined ? table.width : defaultShape.width,
    height: table.height !== undefined ? table.height : defaultShape.height,
    shape: shape,
    color: table.color || TABLE_COLORS[index % TABLE_COLORS.length],
    rotation: table.rotation || 0,
    // Points pour forme personnalisée
    customPoints: table.customPoints || null
  }
}

// ==================== HOOK PRINCIPAL ====================

export function useSeatingPlanState(eventId) {
  // État de chargement
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Layout de la salle
  const [roomLayout, setRoomLayout] = useState(DEFAULT_ROOM_LAYOUT)
  
  // Positions et propriétés des tables
  const [tablePositions, setTablePositions] = useState({})
  
  // Référence pour éviter les sauvegardes multiples
  const saveTimeoutRef = useRef(null)
  const lastSavedRef = useRef(null)

  // ==================== CHARGEMENT INITIAL ====================

  const loadRoomState = useCallback(async (tablesData = []) => {
    try {
      // 1. Charger le layout de la salle depuis Firestore
      const savedLayout = await getRoomLayout(eventId)
      
      if (savedLayout) {
        // Fusionner avec les valeurs par défaut pour gérer les nouvelles propriétés
        setRoomLayout({
          ...DEFAULT_ROOM_LAYOUT,
          ...savedLayout,
          roomShape: {
            ...DEFAULT_ROOM_LAYOUT.roomShape,
            ...(savedLayout.roomShape || {})
          }
        })
      }
      
      // 2. Initialiser les positions des tables
      const positions = {}
      tablesData.forEach((table, index) => {
        positions[table.id] = createDefaultTablePosition(table, index)
      })
      setTablePositions(positions)
      
      // Sauvegarder la référence initiale
      lastSavedRef.current = {
        roomLayout: savedLayout || DEFAULT_ROOM_LAYOUT,
        tablePositions: positions
      }
      
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error loading room state:', error)
      toast.error('Erreur lors du chargement du plan de salle')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  // ==================== SAUVEGARDE ====================

  const saveRoomState = useCallback(async () => {
    if (!eventId || saving) return
    
    try {
      setSaving(true)
      
      // 1. Sauvegarder le layout de la salle
      await saveRoomLayout(eventId, {
        canvasWidth: roomLayout.canvasWidth,
        canvasHeight: roomLayout.canvasHeight,
        zoom: roomLayout.zoom,
        offsetX: roomLayout.offsetX,
        offsetY: roomLayout.offsetY,
        roomShape: roomLayout.roomShape,
        entrances: roomLayout.entrances,
        stages: roomLayout.stages
      })
      
      // 2. Sauvegarder les positions des tables
      const updatePromises = Object.entries(tablePositions).map(([tableId, pos]) => 
        updateTable(tableId, {
          posX: pos.x,
          posY: pos.y,
          width: pos.width,
          height: pos.height,
          shape: pos.shape,
          color: pos.color,
          rotation: pos.rotation,
          customPoints: pos.customPoints || null
        })
      )
      
      await Promise.all(updatePromises)
      
      // Mettre à jour la référence
      lastSavedRef.current = {
        roomLayout: { ...roomLayout },
        tablePositions: { ...tablePositions }
      }
      
      setHasUnsavedChanges(false)
      toast.success('Plan de salle sauvegardé')
    } catch (error) {
      console.error('Error saving room state:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }, [eventId, roomLayout, tablePositions, saving])

  // Auto-save avec debounce
  const scheduleAutoSave = useCallback(() => {
    setHasUnsavedChanges(true)
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Sauvegarder automatiquement après 3 secondes d'inactivité
    saveTimeoutRef.current = setTimeout(() => {
      saveRoomState()
    }, 3000)
  }, [saveRoomState])

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // ==================== ACTIONS SUR LA SALLE ====================

  const updateRoomDimensions = useCallback((width, height) => {
    setRoomLayout(prev => {
      const scaleX = width / prev.canvasWidth
      const scaleY = height / prev.canvasHeight
      
      // Scale room shape points proportionally
      const scaledPoints = prev.roomShape?.points?.map(p => ({
        x: Math.round(p.x * scaleX),
        y: Math.round(p.y * scaleY)
      }))
      
      return {
        ...prev,
        canvasWidth: width,
        canvasHeight: height,
        roomShape: {
          ...prev.roomShape,
          ...(scaledPoints ? { points: scaledPoints } : {})
        }
      }
    })
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const updateZoom = useCallback((zoom) => {
    setRoomLayout(prev => ({
      ...prev,
      zoom: Math.max(0.3, Math.min(3, zoom))
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const updateOffset = useCallback((offsetX, offsetY) => {
    setRoomLayout(prev => ({
      ...prev,
      offsetX,
      offsetY
    }))
    // Pas d'auto-save pour le pan (trop fréquent)
  }, [])

  const updateRoomShape = useCallback((shapeData) => {
    setRoomLayout(prev => ({
      ...prev,
      roomShape: {
        ...prev.roomShape,
        ...shapeData
      }
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const setRoomShapePoints = useCallback((points) => {
    setRoomLayout(prev => ({
      ...prev,
      roomShape: {
        ...prev.roomShape,
        type: 'polygon',
        points
      }
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // ==================== ACTIONS SUR LES ENTRÉES ====================

  const addEntrance = useCallback((entrance) => {
    const newEntrance = {
      id: `entrance-${Date.now()}`,
      x: entrance.x || 600,
      y: entrance.y || 750,
      width: entrance.width || 80,
      rotation: entrance.rotation || 0,
      isMain: entrance.isMain || false,
      hasRedCarpet: entrance.hasRedCarpet || false,
      label: entrance.label || null
    }
    
    setRoomLayout(prev => ({
      ...prev,
      entrances: [...prev.entrances, newEntrance]
    }))
    scheduleAutoSave()
    return newEntrance.id
  }, [scheduleAutoSave])

  const updateEntrance = useCallback((entranceId, data) => {
    setRoomLayout(prev => ({
      ...prev,
      entrances: prev.entrances.map(e => 
        e.id === entranceId ? { ...e, ...data } : e
      )
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const removeEntrance = useCallback((entranceId) => {
    setRoomLayout(prev => ({
      ...prev,
      entrances: prev.entrances.filter(e => e.id !== entranceId)
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const setMainEntrance = useCallback((entranceId) => {
    setRoomLayout(prev => ({
      ...prev,
      entrances: prev.entrances.map(e => ({
        ...e,
        isMain: e.id === entranceId
      }))
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // ==================== ACTIONS SUR LES SCÈNES ====================

  const addStage = useCallback((stage) => {
    const newStage = {
      id: `stage-${Date.now()}`,
      x: stage.x || 100,
      y: stage.y || 100,
      width: stage.width || 400,
      height: stage.height || 150,
      rotation: stage.rotation || 0,
      label: stage.label || null,
      allowTablesOnTop: stage.allowTablesOnTop !== false
    }
    
    setRoomLayout(prev => ({
      ...prev,
      stages: [...prev.stages, newStage]
    }))
    scheduleAutoSave()
    return newStage.id
  }, [scheduleAutoSave])

  const updateStage = useCallback((stageId, data) => {
    setRoomLayout(prev => ({
      ...prev,
      stages: prev.stages.map(s => 
        s.id === stageId ? { ...s, ...data } : s
      )
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const removeStage = useCallback((stageId) => {
    setRoomLayout(prev => ({
      ...prev,
      stages: prev.stages.filter(s => s.id !== stageId)
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  // ==================== ACTIONS SUR LES TABLES ====================

  const updateTablePosition = useCallback((tableId, x, y) => {
    setTablePositions(prev => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        x,
        y
      }
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const updateTableSize = useCallback((tableId, width, height) => {
    setTablePositions(prev => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        width,
        height
      }
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const updateTableProperties = useCallback((tableId, properties) => {
    setTablePositions(prev => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        ...properties
      }
    }))
    scheduleAutoSave()
  }, [scheduleAutoSave])

  const initializeNewTable = useCallback((tableId, table, index) => {
    setTablePositions(prev => ({
      ...prev,
      [tableId]: createDefaultTablePosition(table, index)
    }))
  }, [])

  const removeTablePosition = useCallback((tableId) => {
    setTablePositions(prev => {
      const newPositions = { ...prev }
      delete newPositions[tableId]
      return newPositions
    })
  }, [])

  // ==================== UTILITAIRES ====================

  // Vérifie si un point est à l'intérieur de la forme de la salle
  const isPointInsideRoom = useCallback((x, y) => {
    const { points } = roomLayout.roomShape
    if (!points || points.length < 3) return true
    
    // Algorithme ray casting pour polygone
    let inside = false
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y
      const xj = points[j].x, yj = points[j].y
      
      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
      
      if (intersect) inside = !inside
    }
    
    return inside
  }, [roomLayout.roomShape])

  // Contraint une position de table à l'intérieur de la salle
  const constrainToRoom = useCallback((x, y, width, height) => {
    const padding = 20
    const minX = padding
    const minY = padding
    const maxX = roomLayout.canvasWidth - width - padding
    const maxY = roomLayout.canvasHeight - height - padding
    
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    }
  }, [roomLayout.canvasWidth, roomLayout.canvasHeight])

  // ==================== RETOUR DU HOOK ====================

  return {
    // État
    loading,
    saving,
    hasUnsavedChanges,
    roomLayout,
    tablePositions,
    
    // Actions principales
    loadRoomState,
    saveRoomState,
    
    // Actions salle
    updateRoomDimensions,
    updateZoom,
    updateOffset,
    updateRoomShape,
    setRoomShapePoints,
    
    // Actions entrées
    addEntrance,
    updateEntrance,
    removeEntrance,
    setMainEntrance,
    
    // Actions scènes
    addStage,
    updateStage,
    removeStage,
    
    // Actions tables
    updateTablePosition,
    updateTableSize,
    updateTableProperties,
    initializeNewTable,
    removeTablePosition,
    
    // Utilitaires
    isPointInsideRoom,
    constrainToRoom
  }
}

export default useSeatingPlanState
