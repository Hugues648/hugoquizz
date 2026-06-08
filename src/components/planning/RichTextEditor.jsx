import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiBold, FiItalic, FiMapPin, FiDroplet } from 'react-icons/fi'
import { HexColorPicker } from 'react-colorful'

// Preset colors for quick selection
const PRESET_COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7',
  '#EC4899', '#F43F5E', '#FFFFFF'
]

export default function RichTextEditor({ 
  value = '', 
  onChange, 
  placeholder = '',
  className = '',
  showLocationLink = false,
  locationUrl = '',
  onLocationUrlChange,
  previewStyle = null
}) {
  const { t } = useTranslation()
  const editorRef = useRef(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [customColor, setCustomColor] = useState('#000000')
  const colorPickerRef = useRef(null)
  const colorBtnRef = useRef(null)
  const isInitialized = useRef(false)
  const savedSelectionRef = useRef(null)

  // Save current selection range
  const saveSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
    }
  }

  // Restore saved selection range
  const restoreSelection = () => {
    if (savedSelectionRef.current && editorRef.current) {
      editorRef.current.focus()
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(savedSelectionRef.current)
    }
  }

  // Select all text in editor if nothing is selected
  const selectAllIfNoSelection = () => {
    if (editorRef.current) {
      editorRef.current.focus()
      const sel = window.getSelection()
      // If no selection or selection is collapsed (just cursor), select all content
      if (!sel || sel.isCollapsed || sel.toString().length === 0) {
        const range = document.createRange()
        range.selectNodeContents(editorRef.current)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return
    const handleClick = (e) => {
      if (
        colorPickerRef.current && !colorPickerRef.current.contains(e.target) &&
        colorBtnRef.current && !colorBtnRef.current.contains(e.target)
      ) {
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [showColorPicker])

  // Initialize content only once when value changes from outside (not from typing)
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = value || ''
      isInitialized.current = true
    }
  }, [])

  // Update content when value changes from parent (e.g., when loading data)
  useEffect(() => {
    if (editorRef.current && isInitialized.current) {
      // Only update if the value is different and not caused by user input
      const currentContent = editorRef.current.innerHTML
      if (value !== currentContent && document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || ''
      }
    }
  }, [value])

  const execCommand = useCallback((command, value = null) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    // Trigger onChange
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const handleBold = () => execCommand('bold')
  const handleItalic = () => execCommand('italic')
  
  const handleColorChange = (color) => {
    // Restore focus and selection in the editor
    restoreSelection()
    // If nothing was selected, select all text
    selectAllIfNoSelection()
    execCommand('foreColor', color)
    setShowColorPicker(false)
  }

  const handleInput = () => {
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-t-lg border-b border-gray-200 dark:border-gray-600">
        <button
          type="button"
          onClick={handleBold}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title={t('planning.editor.bold')}
        >
          <FiBold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleItalic}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title={t('planning.editor.italic')}
        >
          <FiItalic className="w-4 h-4" />
        </button>
        
        {/* Color picker */}
        <div className="relative">
          <button
            ref={colorBtnRef}
            type="button"
            onClick={() => {
              if (!showColorPicker) saveSelection()
              setShowColorPicker(!showColorPicker)
            }}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
            title={t('planning.editor.textColor')}
          >
            <FiDroplet className="w-4 h-4" />
            <div 
              className="w-3 h-3 rounded-sm border border-gray-300"
              style={{ backgroundColor: customColor }}
            />
          </button>
          
          {showColorPicker && (
            <div
              ref={colorPickerRef}
              className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3"
              style={{ width: '260px' }}
            >
              {/* Preset colors grid */}
              <div className="grid grid-cols-10 gap-1.5 mb-3">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setCustomColor(color)
                      handleColorChange(color)
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    className={`w-5 h-5 rounded-full border hover:scale-125 transition-transform ${
                      color === '#FFFFFF' 
                        ? 'border-gray-300 dark:border-gray-500' 
                        : 'border-transparent'
                    } ${customColor === color ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                {/* Canva-style HexColorPicker */}
                <div className="canva-color-picker-sm">
                  <HexColorPicker
                    color={customColor}
                    onChange={(c) => setCustomColor(c)}
                  />
                </div>

                {/* Apply button */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleColorChange(customColor)}
                  className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <span
                    className="w-4 h-4 rounded-full border-2 border-white/50"
                    style={{ backgroundColor: customColor }}
                  />
                  {t('common.apply')}
                </button>
              </div>
            </div>
          )}
        </div>

        {showLocationLink && (
          <>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
            <div className="flex items-center gap-1">
              <FiMapPin className="w-4 h-4 text-gray-500" />
              <input
                type="url"
                value={locationUrl}
                onChange={(e) => onLocationUrlChange?.(e.target.value)}
                placeholder={t('planning.editor.mapLinkPlaceholder')}
                className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 w-40"
              />
            </div>
          </>
        )}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[60px] p-3 bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-600 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
        style={previewStyle || undefined}
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      <style>{`
        .rich-text-editor [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
