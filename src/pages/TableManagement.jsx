import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { 
  getEventById, 
  getGuestsByEvent,
  getTablesByEvent,
  createTable,
  updateTable,
  deleteTable,
  updateGuest
} from '../services/firestore'
import { 
  FiArrowLeft, FiUsers, FiTrash2, FiEdit2,
  FiPlus, FiX, FiGrid, FiUserMinus, FiUserPlus,
  FiCheck, FiClock, FiFilter
} from 'react-icons/fi'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'

export default function TableManagement() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState(null)
  const [guests, setGuests] = useState([])
  const [tables, setTables] = useState([])
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    capacity: 8
  })

  // Tri des tables
  const [sortMode, setSortMode] = useState('name-asc')

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
    } catch (err) {
      console.error('Erreur chargement:', err)
      toast.error(t('messages.error.loading'))
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      capacity: 8
    })
  }

  const handleAddTable = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error(t('messages.validation.tableNameRequired'))
      return
    }
    
    try {
      const tableData = {
        eventId: id,
        name: formData.name.trim(),
        capacity: parseInt(formData.capacity) || 8
      }
      
      const tableId = await createTable(tableData)
      
      const newTable = { id: tableId, ...tableData }
      setTables([...tables, newTable])
      
      setShowAddModal(false)
      resetForm()
      toast.success(t('messages.success.tableCreated'))
    } catch (err) {
      console.error('Erreur création table:', err)
      toast.error(t('messages.error.creating'))
    }
  }

  const handleEditTable = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error(t('messages.validation.tableNameRequired'))
      return
    }
    
    try {
      const updateData = {
        name: formData.name.trim(),
        capacity: parseInt(formData.capacity) || 8
      }
      
      await updateTable(selectedTable.id, updateData)
      
      // Update table name in guests
      const guestsToUpdate = guests.filter(g => g.tableId === selectedTable.id)
      for (const guest of guestsToUpdate) {
        await updateGuest(guest.id, { tableName: updateData.name })
      }
      
      setTables(tables.map(t => 
        t.id === selectedTable.id ? { ...t, ...updateData } : t
      ))
      
      setGuests(guests.map(g => 
        g.tableId === selectedTable.id ? { ...g, tableName: updateData.name } : g
      ))
      
      setShowEditModal(false)
      setSelectedTable(null)
      resetForm()
      toast.success(t('messages.success.tableUpdated'))
    } catch (err) {
      console.error('Erreur modification table:', err)
      toast.error(t('messages.error.updating'))
    }
  }

  const openEditModal = (table) => {
    setSelectedTable(table)
    setFormData({
      name: table.name || '',
      capacity: table.capacity || 8
    })
    setShowEditModal(true)
  }

  const handleDeleteTable = async (tableId) => {
    try {
      await deleteTable(tableId)
      
      // Update guests that were at this table
      setGuests(guests.map(g => 
        g.tableId === tableId ? { ...g, tableId: null, tableName: null } : g
      ))
      
      setTables(tables.filter(t => t.id !== tableId))
      setDeleteConfirm(null)
      toast.success(t('messages.success.tableDeleted'))
    } catch (err) {
      console.error('Erreur suppression:', err)
      toast.error(t('messages.error.deleting'))
    }
  }

  const openAssignModal = (table) => {
    setSelectedTable(table)
    setShowAssignModal(true)
  }

  const assignGuestToTable = async (guest, tableId, tableName) => {
    try {
      await updateGuest(guest.id, { 
        tableId: tableId || null, 
        tableName: tableName || null 
      })
      
      setGuests(guests.map(g => 
        g.id === guest.id ? { ...g, tableId, tableName } : g
      ))
      
      toast.success(`${guest.firstName} ${tableId ? 'assigné à la table' : 'retiré de la table'}`)
    } catch (err) {
      console.error('Erreur assignation:', err)
      toast.error(t('messages.error.assignmentError'))
    }
  }

  const removeGuestFromTable = async (guest) => {
    await assignGuestToTable(guest, null, null)
  }

  // Marquer un invité (ou son conjoint) présent / absent
  const togglePresence = async (guest, isSpouse = false) => {
    try {
      const updateData = {}
      if (isSpouse) {
        updateData.spouseIsPresent = !guest.spouseIsPresent
        if (!guest.spouseIsPresent) updateData.spouseCheckedInAt = new Date()
      } else {
        updateData.isPresent = !guest.isPresent
        if (!guest.isPresent) updateData.checkedInAt = new Date()
      }

      await updateGuest(guest.id, updateData)

      setGuests(guests.map(g =>
        g.id === guest.id ? { ...g, ...updateData } : g
      ))

      const name = isSpouse ? guest.spouseFirstName : guest.firstName
      const nowPresent = isSpouse ? !guest.spouseIsPresent : !guest.isPresent
      toast.success(t('tableManagement.presenceChanged', '{{name}} marqué(e) comme {{status}}', {
        name,
        status: nowPresent ? t('tableManagement.present', 'Présent') : t('tableManagement.absent', 'Absent')
      }))
    } catch (err) {
      console.error('Erreur changement présence:', err)
      toast.error(t('tableManagement.presenceError', 'Erreur lors du changement de statut'))
    }
  }

  // Get guests for a specific table
  const getTableGuests = (tableId) => {
    return guests.filter(g => g.tableId === tableId)
  }

  // Get unassigned guests
  const unassignedGuests = guests.filter(g => !g.tableId)

  // Stats
  const totalCapacity = tables.reduce((acc, t) => acc + (t.capacity || 0), 0)
  const assignedCount = guests.filter(g => g.tableId).length

  // Tables triées selon le mode choisi (l'ordre alphabétique gère les nombres : Table 2 avant Table 10)
  const sortedTables = [...tables].sort((a, b) => {
    const nameA = a.name || ''
    const nameB = b.name || ''
    const occ = (tbl) => getTableGuests(tbl.id).reduce((acc, g) => acc + (g.ticketType === 'couple' ? 2 : 1), 0)
    switch (sortMode) {
      case 'name-desc':
        return nameB.localeCompare(nameA, undefined, { numeric: true, sensitivity: 'base' })
      case 'capacity-desc':
        return (b.capacity || 0) - (a.capacity || 0)
      case 'capacity-asc':
        return (a.capacity || 0) - (b.capacity || 0)
      case 'occupancy-desc':
        return occ(b) - occ(a)
      case 'occupancy-asc':
        return occ(a) - occ(b)
      case 'name-asc':
      default:
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' })
    }
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/event/${id}/guests`)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FiGrid className="text-amber-400" />
              {t('tableManagement.title', 'Gestion des Tables')}
            </h1>
            <p className="text-white/70">{event?.name}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Link
            to={`/event/${id}/guests`}
            className="btn bg-pink-500 hover:bg-pink-600 text-white flex items-center gap-2"
          >
            <FiUsers />
            {t('tableManagement.guestList', 'Liste des Invités')}
          </Link>
          <button
            onClick={() => {
              resetForm()
              setShowAddModal(true)
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlus />
            {t('tableManagement.addTable', 'Ajouter une Table')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <p className="text-white/70 text-sm">{t('tableManagement.tables', 'Tables')}</p>
          <p className="text-2xl font-bold text-white">{tables.length}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
          <p className="text-white/70 text-sm">{t('tableManagement.totalCapacity', 'Capacité totale')}</p>
          <p className="text-2xl font-bold text-white">{totalCapacity}</p>
        </div>
        <div className="bg-green-500/20 backdrop-blur-lg rounded-xl p-4 border border-green-500/30">
          <p className="text-green-300 text-sm">{t('tableManagement.seatedGuests', 'Invités placés')}</p>
          <p className="text-2xl font-bold text-green-400">{assignedCount}</p>
        </div>
        <div className="bg-amber-500/20 backdrop-blur-lg rounded-xl p-4 border border-amber-500/30">
          <p className="text-amber-300 text-sm">{t('tableManagement.notSeated', 'Non placés')}</p>
          <p className="text-2xl font-bold text-amber-400">{unassignedGuests.length}</p>
        </div>
      </div>

      {/* Barre de tri */}
      {tables.length > 0 && (
        <div className="flex items-center justify-end gap-2 mb-4">
          <label htmlFor="table-sort" className="text-white/80 text-sm flex items-center gap-1.5">
            <FiFilter className="text-amber-400" />
            {t('tableManagement.sortLabel', 'Trier les tables')}
          </label>
          <select
            id="table-sort"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-400 outline-none [&>option]:text-gray-800"
          >
            <option value="name-asc">{t('tableManagement.sortNameAsc', 'Nom (A → Z)')}</option>
            <option value="name-desc">{t('tableManagement.sortNameDesc', 'Nom (Z → A)')}</option>
            <option value="capacity-desc">{t('tableManagement.sortCapacityDesc', 'Capacité (décroissante)')}</option>
            <option value="capacity-asc">{t('tableManagement.sortCapacityAsc', 'Capacité (croissante)')}</option>
            <option value="occupancy-desc">{t('tableManagement.sortOccupancyDesc', 'Occupation (décroissante)')}</option>
            <option value="occupancy-asc">{t('tableManagement.sortOccupancyAsc', 'Occupation (croissante)')}</option>
          </select>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {sortedTables.map(table => {
          const tableGuests = getTableGuests(table.id)
          const occupancy = tableGuests.reduce((acc, g) => acc + (g.ticketType === 'couple' ? 2 : 1), 0)
          const presentCount = tableGuests.reduce(
            (acc, g) => acc + (g.isPresent ? 1 : 0) + (g.ticketType === 'couple' && g.spouseIsPresent ? 1 : 0),
            0
          )
          const isFull = occupancy >= table.capacity
          
          return (
            <div 
              key={table.id}
              className={`bg-white rounded-2xl shadow-xl overflow-hidden border-2 ${
                isFull ? 'border-green-300' : 'border-transparent'
              }`}
            >
              <div className={`p-4 ${isFull ? 'bg-green-50' : 'bg-amber-50'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800">{table.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isFull 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {occupancy}/{table.capacity}
                  </span>
                </div>
                {occupancy > 0 && (
                  <p className="mt-1 text-xs font-medium text-green-600 flex items-center gap-1">
                    <FiCheck className="w-3 h-3" />
                    {t('tableManagement.presentCount', '{{count}}/{{total}} présent(s)', { count: presentCount, total: occupancy })}
                  </p>
                )}
              </div>
              
              <div className="p-4">
                {tableGuests.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">
                    {t('tableManagement.noGuestAssigned', 'Aucun invité assigné')}
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {tableGuests.map(guest => (
                      <li 
                        key={guest.id}
                        className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <button
                            onClick={() => togglePresence(guest, false)}
                            title={guest.isPresent
                              ? t('tableManagement.markAbsent', 'Marquer comme absent')
                              : t('tableManagement.markPresent', 'Marquer comme présent')}
                            aria-label={guest.isPresent
                              ? t('tableManagement.present', 'Présent')
                              : t('tableManagement.absent', 'Absent')}
                            className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full transition-colors ${
                              guest.isPresent
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                            }`}
                          >
                            {guest.isPresent ? <FiCheck className="w-3 h-3" /> : <FiClock className="w-3 h-3" />}
                          </button>
                          <span className="text-gray-700 truncate">
                            {guest.firstName} {guest.lastName}
                          </span>
                          {guest.ticketType === 'couple' && (
                            <button
                              onClick={() => togglePresence(guest, true)}
                              title={guest.spouseIsPresent
                                ? t('tableManagement.markAbsent', 'Marquer comme absent')
                                : t('tableManagement.markPresent', 'Marquer comme présent')}
                              className={`shrink-0 inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full text-xs transition-colors ${
                                guest.spouseIsPresent
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${
                                guest.spouseIsPresent ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'
                              }`}>
                                {guest.spouseIsPresent ? <FiCheck className="w-2.5 h-2.5" /> : <FiClock className="w-2.5 h-2.5" />}
                              </span>
                              +{guest.spouseFirstName}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => removeGuestFromTable(guest)}
                          className="shrink-0 p-1 text-red-500 hover:bg-red-50 rounded"
                          title={t('tableManagement.removeFromTable', 'Retirer de la table')}
                        >
                          <FiUserMinus className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => openAssignModal(table)}
                  className="flex-1 btn bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm py-2"
                  disabled={isFull}
                >
                  <FiUserPlus className="mr-1" />
                  {t('tableManagement.add', 'Ajouter')}
                </button>
                <button
                  onClick={() => openEditModal(table)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-50"
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={() => setDeleteConfirm(table)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          )
        })}
        
        {tables.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl shadow-xl p-12 text-center">
            <FiGrid className="text-6xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{t('tableManagement.noTableCreated', 'Aucune table créée')}</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <FiPlus />
              {t('tableManagement.createFirstTable', 'Créer la première table')}
            </button>
          </div>
        )}
      </div>

      {/* Unassigned Guests */}
      {unassignedGuests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FiUsers className="text-amber-500" />
              {t('tableManagement.unplacedGuests', 'Invités non placés')} ({unassignedGuests.length})
            </h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {unassignedGuests.map(guest => (
                <div
                  key={guest.id}
                  className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1 text-sm"
                >
                  <span className="text-gray-700">
                    {guest.firstName} {guest.lastName}
                    {guest.ticketType === 'couple' && (
                      <span className="text-pink-500 ml-1">(+1)</span>
                    )}
                  </span>
                  {tables.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          const table = tables.find(t => t.id === e.target.value)
                          assignGuestToTable(guest, table.id, table.name)
                        }
                      }}
                      className="text-xs bg-transparent border-none cursor-pointer text-blue-500"
                      defaultValue=""
                    >
                      <option value="">{t('tableManagement.place', 'Placer →')}</option>
                      {tables.map(table => {
                        const occupancy = getTableGuests(table.id).reduce(
                          (acc, g) => acc + (g.ticketType === 'couple' ? 2 : 1), 0
                        )
                        const isFull = occupancy >= table.capacity
                        return (
                          <option key={table.id} value={table.id} disabled={isFull}>
                            {table.name} ({occupancy}/{table.capacity})
                          </option>
                        )
                      })}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t('tableManagement.addTableTitle', 'Ajouter une Table')}</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <FiX />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddTable} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tableManagement.tableNameLabel', 'Nom de la table *')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder={t('tableManagement.tableNamePlaceholder', 'Ex: Table des Mariés, Table 1...')}
                  className="input w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tableManagement.capacityLabel', 'Capacité (nombre de personnes)')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                  className="input w-full"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {t('common.cancel', 'Annuler')}
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                >
                  {t('tableManagement.createTable', 'Créer la table')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {showEditModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t('tableManagement.editTableTitle', 'Modifier la Table')}</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedTable(null)
                    resetForm()
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <FiX />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleEditTable} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tableManagement.tableNameLabel', 'Nom de la table *')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tableManagement.capacityLabel', 'Capacité (nombre de personnes)')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                  className="input w-full"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedTable(null)
                    resetForm()
                  }}
                  className="flex-1 btn bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {t('common.cancel', 'Annuler')}
                </button>
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                >
                  {t('common.save', 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Guest Modal */}
      {showAssignModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  {t('tableManagement.addTo', 'Ajouter à {{name}}', { name: selectedTable.name })}
                </h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false)
                    setSelectedTable(null)
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <FiX />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {unassignedGuests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {t('tableManagement.allGuestsSeated', 'Tous les invités sont déjà placés')}
                </p>
              ) : (
                <div className="space-y-2">
                  {unassignedGuests.map(guest => (
                    <button
                      key={guest.id}
                      onClick={() => {
                        assignGuestToTable(guest, selectedTable.id, selectedTable.name)
                        setShowAssignModal(false)
                        setSelectedTable(null)
                      }}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <span className="text-gray-700">
                        {guest.firstName} {guest.lastName}
                        {guest.ticketType === 'couple' && (
                          <span className="text-pink-500 text-sm ml-2">
                            (+{guest.spouseFirstName})
                          </span>
                        )}
                      </span>
                      <FiPlus className="text-blue-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">{t('tableManagement.confirmDelete', 'Confirmer la suppression')}</h3>
            <p className="text-gray-600 mb-2">
              {t('tableManagement.confirmDeleteMessage', 'Êtes-vous sûr de vouloir supprimer la table')} <strong>{deleteConfirm.name}</strong> ?
            </p>
            <p className="text-sm text-amber-600 mb-6">
              {t('tableManagement.guestsWillBeUnassigned', 'Les invités assignés à cette table seront marqués comme "non placés".')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 btn bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={() => handleDeleteTable(deleteConfirm.id)}
                className="flex-1 btn bg-red-500 text-white hover:bg-red-600"
              >
                {t('common.delete', 'Supprimer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
