/**
 * SeatingPlan - Éditeur professionnel de plan de salle
 * 
 * Fonctionnalités:
 * - Plan de salle avec forme personnalisable (polygone)
 * - Tables déplaçables et redimensionnables
 * - Entrées avec tapis rouge
 * - Scènes pour table d'honneur
 * - Persistance complète de tous les éléments
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { 
  getEventById, 
  getGuestsByEvent,
  getTablesByEvent,
  updateGuest,
  createTable,
  deleteTable
} from '../services/firestore'
import { useSeatingPlanState, TABLE_SHAPES, TABLE_COLORS } from '../hooks/useSeatingPlanState'
import { 
  RoomShapeEditor, 
  DraggableTable, 
  EntranceElement, 
  StageElement 
} from '../components/seating'
import { 
  FiArrowLeft, FiSave, FiPlus, FiTrash2, FiUsers,
  FiCircle, FiSquare, FiZoomIn, FiZoomOut, FiRotateCw,
  FiMaximize2, FiMinimize2, FiGrid, FiCheck, FiX,
  FiLogIn, FiTv, FiAlertCircle, FiEye, FiEyeOff
} from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

const SHAPE_ICONS = {
  round: FiCircle,
  rectangle: FiSquare,
  square: FiSquare
}

export default function SeatingPlan() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  
  // État de base
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [guests, setGuests] = useState([])
  const [tables, setTables] = useState([])
  const [unassignedGuests, setUnassignedGuests] = useState([])
  
  // Hook centralisé pour l'état du plan de salle
  const {
    loading: layoutLoading,
    saving,
    hasUnsavedChanges,
    roomLayout,
    tablePositions,
    loadRoomState,
    saveRoomState,
    updateRoomDimensions,
    updateZoom,
    updateOffset,
    updateRoomShape,
    addEntrance,
    updateEntrance,
    removeEntrance,
    setMainEntrance,
    addStage,
    updateStage,
    removeStage,
    updateTablePosition,
    updateTableSize,
    updateTableProperties,
    initializeNewTable,
    removeTablePosition,
    constrainToRoom
  } = useSeatingPlanState(id)
  
  // État du pan (déplacement du canvas)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  
  // UI state
  const [selectedElement, setSelectedElement] = useState(null) // { type: 'table'|'entrance'|'stage', id }
  const [showAddTable, setShowAddTable] = useState(false)
  const [showSizeControls, setShowSizeControls] = useState(false)
  const [showAddElements, setShowAddElements] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showGuestInitials, setShowGuestInitials] = useState(true)
  
  // Form pour nouvelle table
  const [newTableName, setNewTableName] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState(8)
  const [newTableShape, setNewTableShape] = useState('round')
  const [newTableColor, setNewTableColor] = useState(TABLE_COLORS[0])

  // ==================== CHARGEMENT DES DONNÉES ====================

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const eventData = await getEventById(id)
      
      if (!eventData) {
        toast.error(t('messages.error.eventNotFound'))
        navigate('/dashboard')
        return
      }
      
      if (eventData.userId !== user?.uid) {
        toast.error(t('messages.error.accessDenied'))
        navigate('/dashboard')
        return
      }
      
      setEvent(eventData)
      
      const [guestsData, tablesData] = await Promise.all([
        getGuestsByEvent(id),
        getTablesByEvent(id)
      ])
      
      setGuests(guestsData)
      setTables(tablesData)
      setUnassignedGuests(guestsData.filter(g => !g.tableId))
      
      // Charger l'état du plan de salle (positions, forme, etc.)
      await loadRoomState(tablesData)
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error(t('messages.error.loading'))
    } finally {
      setLoading(false)
    }
  }

  // ==================== GESTION DES INVITÉS ====================

  const getTableGuests = (tableId) => {
    return guests.filter(g => g.tableId === tableId)
  }

  const handleAssignGuest = async (guestId, tableId, tableName) => {
    try {
      await updateGuest(guestId, { tableId, tableName })
      
      // Mise à jour locale
      setGuests(prev => prev.map(g => 
        g.id === guestId ? { ...g, tableId, tableName } : g
      ))
      setUnassignedGuests(prev => prev.filter(g => g.id !== guestId))
      
      toast.success(t('messages.success.guestAssigned'))
    } catch (error) {
      console.error('Error assigning guest:', error)
      toast.error(t('messages.error.assignmentError'))
    }
  }

  const handleUnassignGuest = async (guestId) => {
    try {
      await updateGuest(guestId, { tableId: null, tableName: null })
      
      // Mise à jour locale
      const guest = guests.find(g => g.id === guestId)
      setGuests(prev => prev.map(g => 
        g.id === guestId ? { ...g, tableId: null, tableName: null } : g
      ))
      if (guest) {
        setUnassignedGuests(prev => [...prev, { ...guest, tableId: null, tableName: null }])
      }
      
      toast.success(t('messages.success.guestRemoved'))
    } catch (error) {
      console.error('Error unassigning guest:', error)
      toast.error(t('messages.error.generic'))
    }
  }

  // ==================== GESTION DES TABLES ====================

  const handleAddTable = async () => {
    if (!newTableName.trim()) {
      toast.error(t('messages.validation.nameRequired'))
      return
    }
    
    try {
      const tableData = {
        eventId: id,
        name: newTableName,
        capacity: newTableCapacity,
        shape: newTableShape,
        color: newTableColor,
        posX: 200 + Math.random() * 200,
        posY: 200 + Math.random() * 200,
        width: TABLE_SHAPES[newTableShape]?.width || 140,
        height: TABLE_SHAPES[newTableShape]?.height || 140
      }
      
      const tableId = await createTable(tableData)
      
      // Mise à jour locale
      const newTable = { id: tableId, ...tableData }
      setTables(prev => [...prev, newTable])
      initializeNewTable(tableId, newTable, tables.length)
      
      setShowAddTable(false)
      setNewTableName('')
      toast.success(t('messages.success.tableAdded'))
    } catch (error) {
      console.error('Error adding table:', error)
      toast.error(t('messages.error.creating'))
    }
  }

  const handleDeleteTable = async (tableId) => {
    try {
      // Désassigner tous les invités de cette table
      const tableGuests = getTableGuests(tableId)
      await Promise.all(tableGuests.map(g => 
        updateGuest(g.id, { tableId: null, tableName: null })
      ))
      
      await deleteTable(tableId)
      
      // Mise à jour locale
      setTables(prev => prev.filter(t => t.id !== tableId))
      setGuests(prev => prev.map(g => 
        g.tableId === tableId ? { ...g, tableId: null, tableName: null } : g
      ))
      setUnassignedGuests(prev => [
        ...prev, 
        ...tableGuests.map(g => ({ ...g, tableId: null, tableName: null }))
      ])
      removeTablePosition(tableId)
      setSelectedElement(null)
      
      toast.success(t('messages.success.tableDeleted'))
    } catch (error) {
      console.error('Error deleting table:', error)
      toast.error(t('messages.error.deleting'))
    }
  }

  // ==================== GESTION DU PAN (DÉPLACEMENT DU CANVAS) ====================

  const handleCanvasMouseDown = (e) => {
    if (e.target === e.currentTarget || e.target === canvasRef.current) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
      setSelectedElement(null)
    }
  }

  const handleCanvasMouseMove = useCallback((e) => {
    if (!isPanning) return
    
    const newOffset = {
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    }
    setPanOffset(newOffset)
  }, [isPanning, panStart])

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      updateOffset(panOffset.x, panOffset.y)
    }
  }

  // Touch handlers pour mobile
  const handleCanvasTouchStart = (e) => {
    if (e.target === e.currentTarget || e.target === canvasRef.current) {
      const touch = e.touches[0]
      setIsPanning(true)
      setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y })
      setSelectedElement(null)
    }
  }

  const handleCanvasTouchMove = useCallback((e) => {
    if (!isPanning) return
    e.preventDefault()
    
    const touch = e.touches[0]
    const newOffset = {
      x: touch.clientX - panStart.x,
      y: touch.clientY - panStart.y
    }
    setPanOffset(newOffset)
  }, [isPanning, panStart])

  // ==================== ZOOM ====================

  const handleZoomIn = () => {
    const newZoom = Math.min(roomLayout.zoom + 0.1, 3)
    updateZoom(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(roomLayout.zoom - 0.1, 0.3)
    updateZoom(newZoom)
  }

  const handleResetView = () => {
    updateZoom(1)
    setPanOffset({ x: 0, y: 0 })
    updateOffset(0, 0)
  }

  // Zoom avec molette
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      const newZoom = Math.max(0.3, Math.min(3, roomLayout.zoom + delta))
      updateZoom(newZoom)
    }
  }, [roomLayout.zoom, updateZoom])

  // ==================== FULLSCREEN ====================

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // ==================== AJOUT D'ÉLÉMENTS ====================

  const handleAddEntrance = () => {
    addEntrance({
      x: roomLayout.canvasWidth / 2,
      y: roomLayout.canvasHeight - 50,
      isMain: roomLayout.entrances.length === 0,
      hasRedCarpet: roomLayout.entrances.length === 0
    })
    setShowAddElements(false)
    toast.success(t('seatingPlan.entranceAdded', 'Entrée ajoutée'))
  }

  const handleAddStage = () => {
    addStage({
      x: (roomLayout.canvasWidth - 400) / 2,
      y: 50,
      width: 400,
      height: 150
    })
    setShowAddElements(false)
    toast.success(t('seatingPlan.stageAdded', 'Scène ajoutée'))
  }

  // ==================== DRAG & DROP INVITÉS ====================

  const handleGuestDragStart = (e, guest) => {
    e.dataTransfer.setData('guestId', guest.id)
    e.dataTransfer.setData('guestName', `${guest.firstName} ${guest.lastName}`)
  }

  // ==================== RENDER ====================

  if (loading || layoutLoading) {
    return <LoadingSpinner fullScreen text={t('seatingPlan.loading', 'Chargement du plan de salle...')} />
  }

  const eventType = event?.eventType || 'autre'
  const eventEmoji = eventType === 'mariage' ? '💒' : eventType === 'anniversaire' ? '🎂' : '🎉'

  const selectedTable = selectedElement?.type === 'table' 
    ? tables.find(t => t.id === selectedElement.id)
    : null

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/event/${id}/guests`}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <FiGrid className="text-purple-500" />
              {t('seatingPlan.title', 'Plan de salle')}
              {hasUnsavedChanges && (
                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <FiAlertCircle size={12} />
                  {t('seatingPlan.unsaved', 'Non sauvegardé')}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">{eventEmoji} {event?.title}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={saveRoomState}
            disabled={saving || !hasUnsavedChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              hasUnsavedChanges
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiSave />
            )}
            {t('seatingPlan.save', 'Sauvegarder')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar - Invités non placés */}
        <div className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r overflow-hidden flex flex-col max-h-48 md:max-h-none">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FiUsers className="text-purple-500" />
              {t('seatingPlan.unplacedGuests', 'Invités non placés')}
              <span className="ml-auto bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-sm">
                {unassignedGuests.length}
              </span>
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-auto p-2">
            {unassignedGuests.length === 0 ? (
              <div className="text-center py-4 md:py-8 text-gray-400">
                <FiCheck className="text-2xl md:text-4xl mx-auto mb-2 text-green-400" />
                <p className="text-sm">{t('seatingPlan.allGuestsPlaced', 'Tous les invités sont placés !')}</p>
              </div>
            ) : (
              <div className="flex md:flex-col gap-2 md:space-y-1">
                {unassignedGuests.map(guest => (
                  <div
                    key={guest.id}
                    draggable
                    onDragStart={(e) => handleGuestDragStart(e, guest)}
                    className="p-2 bg-gray-50 rounded-lg cursor-grab hover:bg-purple-50 hover:shadow transition-all border border-gray-200 flex-shrink-0 min-w-[120px] md:min-w-0"
                  >
                    <p className="font-medium text-sm text-gray-800 whitespace-nowrap">
                      {guest.firstName} {guest.lastName}
                    </p>
                    {guest.ticketType === 'couple' && (
                      <p className="text-xs text-pink-500 whitespace-nowrap">
                        + {guest.spouseFirstName} {guest.spouseLastName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Boutons d'ajout */}
          <div className="p-2 md:p-3 border-t flex-shrink-0 space-y-2">
            <button
              onClick={() => setShowAddTable(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
            >
              <FiPlus />
              <span>{t('seatingPlan.addTable', 'Ajouter une table')}</span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowAddElements(!showAddElements)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                <FiPlus />
                <span>{t('seatingPlan.addElement', 'Ajouter élément')}</span>
              </button>
              
              {showAddElements && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border p-2 z-50">
                  <button
                    onClick={handleAddEntrance}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left"
                  >
                    <FiLogIn />
                    {t('seatingPlan.entrance', 'Entrée')}
                  </button>
                  <button
                    onClick={handleAddStage}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded text-sm text-left"
                  >
                    <FiTv />
                    {t('seatingPlan.stage', 'Scène')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zone du Canvas */}
        <div 
          className="flex-1 relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 min-h-[400px] touch-none"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onTouchStart={handleCanvasTouchStart}
          onTouchMove={handleCanvasTouchMove}
          onTouchEnd={handleCanvasMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        >
          {/* Contrôles de zoom et taille */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
            <button
              onClick={handleZoomIn}
              className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
              title={t('seatingPlan.zoomIn', 'Zoom +')}
            >
              <FiZoomIn />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
              title={t('seatingPlan.zoomOut', 'Zoom -')}
            >
              <FiZoomOut />
            </button>
            <div className="px-2 py-1 bg-white rounded-lg shadow text-xs text-center text-gray-600">
              {Math.round(roomLayout.zoom * 100)}%
            </div>
            <button
              onClick={handleResetView}
              className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
              title={t('seatingPlan.resetView', 'Réinitialiser la vue')}
            >
              <FiRotateCw />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
              title={t('seatingPlan.fullscreen', 'Plein écran')}
            >
              {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
            <button
              onClick={() => setShowSizeControls(!showSizeControls)}
              className={`p-2 rounded-lg shadow ${showSizeControls ? 'bg-purple-500 text-white' : 'bg-white hover:bg-gray-50'}`}
              title={t('seatingPlan.adjustDimensions', 'Ajuster les dimensions')}
            >
              <FiGrid />
            </button>
            <button
              onClick={() => setShowGuestInitials(!showGuestInitials)}
              className={`p-2 rounded-lg shadow ${showGuestInitials ? 'bg-purple-500 text-white' : 'bg-white hover:bg-gray-50'}`}
              title={t('seatingPlan.toggleInitials', 'Afficher/masquer les initiales')}
            >
              {showGuestInitials ? <FiEye /> : <FiEyeOff />}
            </button>
          </div>

          {/* Panneau de contrôle des dimensions */}
          {showSizeControls && (
            <div className="absolute top-4 right-16 bg-white rounded-xl shadow-lg p-4 z-30 min-w-[220px]">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">{t('seatingPlan.dimensions', 'Dimensions du plan')}</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    {t('seatingPlan.width', 'Largeur')}: {roomLayout.canvasWidth}px
                  </label>
                  <input
                    type="range"
                    min="800"
                    max="6000"
                    step="100"
                    value={roomLayout.canvasWidth}
                    onChange={(e) => updateRoomDimensions(parseInt(e.target.value), roomLayout.canvasHeight)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    {t('seatingPlan.height', 'Hauteur')}: {roomLayout.canvasHeight}px
                  </label>
                  <input
                    type="range"
                    min="600"
                    max="4000"
                    step="100"
                    value={roomLayout.canvasHeight}
                    onChange={(e) => updateRoomDimensions(roomLayout.canvasWidth, parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => updateRoomDimensions(1200, 800)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {t('seatingPlan.default', 'Défaut')}
                  </button>
                  <button
                    onClick={() => updateRoomDimensions(1920, 1080)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {t('seatingPlan.large', 'Grand')}
                  </button>
                  <button
                    onClick={() => updateRoomDimensions(3000, 2000)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {t('seatingPlan.extraLarge', 'Très grand')}
                  </button>
                  <button
                    onClick={() => updateRoomDimensions(5000, 3000)}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {t('seatingPlan.xxl', 'XXL')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Canvas du plan de salle */}
          <div
            ref={canvasRef}
            style={{
              width: roomLayout.canvasWidth,
              height: roomLayout.canvasHeight,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${roomLayout.zoom})`,
              transformOrigin: 'top left',
              position: 'relative',
              background: 'repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(0,0,0,0.03) 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(0,0,0,0.03) 50px)'
            }}
          >
            {/* Éditeur de forme de la salle */}
            <RoomShapeEditor
              canvasWidth={roomLayout.canvasWidth}
              canvasHeight={roomLayout.canvasHeight}
              roomShape={roomLayout.roomShape}
              onUpdateShape={updateRoomShape}
              zoom={roomLayout.zoom}
              offset={panOffset}
            />

            {/* Scènes */}
            {roomLayout.stages.map(stage => (
              <StageElement
                key={stage.id}
                stage={stage}
                isSelected={selectedElement?.type === 'stage' && selectedElement?.id === stage.id}
                onSelect={(stageId) => setSelectedElement({ type: 'stage', id: stageId })}
                onUpdate={updateStage}
                onRemove={removeStage}
                zoom={roomLayout.zoom}
              />
            ))}

            {/* Entrées */}
            {roomLayout.entrances.map(entrance => (
              <EntranceElement
                key={entrance.id}
                entrance={entrance}
                isSelected={selectedElement?.type === 'entrance' && selectedElement?.id === entrance.id}
                onSelect={(entranceId) => setSelectedElement({ type: 'entrance', id: entranceId })}
                onUpdate={updateEntrance}
                onRemove={removeEntrance}
                onSetMain={setMainEntrance}
                zoom={roomLayout.zoom}
              />
            ))}

            {/* Tables */}
            {tables.map(table => (
              <DraggableTable
                key={table.id}
                table={table}
                position={tablePositions[table.id]}
                guests={getTableGuests(table.id)}
                isSelected={selectedElement?.type === 'table' && selectedElement?.id === table.id}
                onSelect={(tableId) => setSelectedElement({ type: 'table', id: tableId })}
                onPositionChange={updateTablePosition}
                onSizeChange={updateTableSize}
                onRotationChange={(tableId, rotation) => updateTableProperties(tableId, { rotation })}
                onGuestDrop={handleAssignGuest}
                zoom={roomLayout.zoom}
                constrainToRoom={constrainToRoom}
                showGuestInitials={showGuestInitials}
              />
            ))}
          </div>

          {/* État vide */}
          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center pointer-events-auto">
                <FiGrid className="text-6xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-4">{t('seatingPlan.noTables', 'Aucune table pour le moment')}</p>
                <button
                  onClick={() => setShowAddTable(true)}
                  className="btn btn-primary"
                >
                  <FiPlus className="mr-2" />
                  {t('seatingPlan.createFirstTable', 'Créer la première table')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panneau de détails de la table sélectionnée */}
        {selectedTable && (
          <div className="w-80 bg-white border-l overflow-hidden flex flex-col">
            {(() => {
              const pos = tablePositions[selectedTable.id]
              const tableGuests = getTableGuests(selectedTable.id)
              
              return (
                <>
                  <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800">{selectedTable.name}</h2>
                    <button
                      onClick={() => setSelectedElement(null)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <FiX />
                    </button>
                  </div>
                  
                  <div className="p-4 space-y-4 overflow-y-auto flex-1">
                    {/* Couleur */}
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">{t('seatingPlan.color', 'Couleur')}</label>
                      <div className="flex flex-wrap gap-2">
                        {TABLE_COLORS.map(color => (
                          <button
                            key={color}
                            onClick={() => updateTableProperties(selectedTable.id, { color })}
                            className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                              pos?.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Forme */}
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">{t('seatingPlan.shape', 'Forme')}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(TABLE_SHAPES).filter(([key]) => key !== 'custom').map(([key, { label }]) => {
                          const Icon = SHAPE_ICONS[key] || FiSquare
                          return (
                            <button
                              key={key}
                              onClick={() => updateTableProperties(selectedTable.id, { 
                                shape: key,
                                width: TABLE_SHAPES[key].width,
                                height: TABLE_SHAPES[key].height
                              })}
                              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border-2 transition-colors ${
                                pos?.shape === key 
                                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Icon size={18} />
                              <span className="text-xs">{label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    
                    {/* Taille */}
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">
                        {t('seatingPlan.size', 'Taille')}: {pos?.width || 140}×{pos?.height || 140}px
                      </label>
                      <input
                        type="range"
                        min="80"
                        max="300"
                        value={pos?.width || 140}
                        onChange={(e) => {
                          const size = parseInt(e.target.value)
                          const ratio = pos?.shape === 'rectangle' ? 0.6 : 1
                          updateTableSize(selectedTable.id, size, Math.round(size * ratio))
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Liste des invités */}
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">
                        {t('seatingPlan.guests', 'Invités')} ({tableGuests.length}/{selectedTable.capacity})
                      </label>
                      {tableGuests.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">{t('seatingPlan.dragGuestsHere', 'Glissez des invités ici')}</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {tableGuests.map(guest => (
                            <div
                              key={guest.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {guest.firstName} {guest.lastName}
                                </p>
                                {guest.ticketType === 'couple' && (
                                  <p className="text-xs text-pink-500">
                                    + {guest.spouseFirstName}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleUnassignGuest(guest.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <FiX size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Bouton supprimer */}
                  <div className="p-4 border-t">
                    <button
                      onClick={() => {
                        if (confirm(t('seatingPlan.confirmDeleteTable', 'Supprimer la table "{{name}}" ?', { name: selectedTable.name }))) {
                          handleDeleteTable(selectedTable.id)
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                      <FiTrash2 />
                      {t('seatingPlan.deleteTable', 'Supprimer la table')}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        )}
      </div>

      {/* Modal nouvelle table */}
      {showAddTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('seatingPlan.newTable', 'Nouvelle table')}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('seatingPlan.tableName', 'Nom de la table')}
                </label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder={t('seatingPlan.tableNamePlaceholder', "Table 1, Table d'honneur...")}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('seatingPlan.capacity', 'Capacité (personnes)')}
                </label>
                <input
                  type="number"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 8)}
                  min={1}
                  max={20}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('seatingPlan.shape', 'Forme')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TABLE_SHAPES).filter(([key]) => key !== 'custom').map(([key, { label }]) => {
                    const Icon = SHAPE_ICONS[key] || FiSquare
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNewTableShape(key)}
                        className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg border-2 transition-colors ${
                          newTableShape === key 
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="text-xs">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('seatingPlan.color', 'Couleur')}</label>
                <div className="flex flex-wrap gap-2">
                  {TABLE_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTableColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        newTableColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddTable(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleAddTable}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                {t('seatingPlan.create', 'Créer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
