import { useState, useRef, useEffect, useCallback } from 'react'
import { HexColorPicker } from 'react-colorful'

export default function ColorPicker({ color, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hexInput, setHexInput] = useState((color || '#000000').replace('#', ''))
  const popoverRef = useRef(null)
  const triggerRef = useRef(null)

  // Sync hex input when color prop changes externally
  useEffect(() => {
    setHexInput((color || '#000000').replace('#', '').toUpperCase())
  }, [color])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [isOpen])

  // Parse hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  // RGB to Hex
  const rgbToHex = (r, g, b) => {
    const toHex = (n) => {
      const clamped = Math.max(0, Math.min(255, Math.round(n)))
      return clamped.toString(16).padStart(2, '0')
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  const rgb = hexToRgb(color || '#000000')

  const handlePickerChange = useCallback((newColor) => {
    onChange(newColor)
    setHexInput(newColor.replace('#', '').toUpperCase())
  }, [onChange])

  const handleHexInputChange = (e) => {
    let val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6)
    setHexInput(val.toUpperCase())
    if (val.length === 6 && /^[0-9A-Fa-f]{6}$/.test(val)) {
      onChange('#' + val)
    }
  }

  const handleRgbChange = (channel, value) => {
    const num = Math.max(0, Math.min(255, parseInt(value) || 0))
    const newRgb = { ...rgb, [channel]: num }
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b)
    setHexInput(hex.replace('#', '').toUpperCase())
    onChange(hex)
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger: swatch (opens picker) + editable hex input */}
      <div
        ref={triggerRef}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-colors shadow-sm"
      >
        <span
          className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-500 flex-shrink-0 shadow-inner cursor-pointer"
          style={{ backgroundColor: color || '#000000' }}
          onClick={() => setIsOpen(!isOpen)}
        />
        <div className="flex items-center">
          <span className="text-sm font-mono text-gray-400 select-none">#</span>
          <input
            type="text"
            value={hexInput}
            onChange={handleHexInputChange}
            onBlur={() => {
              if (hexInput.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hexInput)) {
                setHexInput((color || '#000000').replace('#', '').toUpperCase())
              }
            }}
            className="w-[4.5rem] bg-transparent text-sm font-mono text-gray-700 dark:text-gray-200 tracking-wide outline-none border-b border-transparent focus:border-gray-400 dark:focus:border-gray-400 transition-colors"
            maxLength={6}
          />
        </div>
      </div>

      {/* Canva-style popover panel */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700"
          style={{ left: 0, width: '280px' }}
        >
          {/* Gradient picker area */}
          <div className="canva-color-picker p-4 pb-3">
            <HexColorPicker
              color={color || '#000000'}
              onChange={handlePickerChange}
            />
          </div>

          {/* Input row: preview + HEX + R + G + B */}
          <div className="px-4 pb-4">
            <div className="flex items-end gap-2">
              {/* Live preview circle */}
              <div className="flex flex-col items-center flex-shrink-0">
                <span
                  className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600 shadow-sm"
                  style={{ backgroundColor: color || '#000000' }}
                />
              </div>

              {/* HEX input */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className="flex items-center w-full h-10 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700">
                  <span className="px-2 text-sm text-gray-400 font-mono select-none">#</span>
                  <input
                    type="text"
                    value={hexInput}
                    onChange={handleHexInputChange}
                    onBlur={() => {
                      if (hexInput.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hexInput)) {
                        setHexInput((color || '#000000').replace('#', '').toUpperCase())
                      }
                    }}
                    className="w-full bg-transparent text-sm font-mono text-gray-800 dark:text-gray-200 outline-none pr-2 tracking-wider"
                    maxLength={6}
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Hex</span>
              </div>

              {/* R */}
              <div className="flex flex-col items-center" style={{ width: '44px' }}>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.r}
                  onChange={(e) => handleRgbChange('r', e.target.value)}
                  className="w-full h-10 text-center text-sm font-mono border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">R</span>
              </div>

              {/* G */}
              <div className="flex flex-col items-center" style={{ width: '44px' }}>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.g}
                  onChange={(e) => handleRgbChange('g', e.target.value)}
                  className="w-full h-10 text-center text-sm font-mono border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">G</span>
              </div>

              {/* B */}
              <div className="flex flex-col items-center" style={{ width: '44px' }}>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.b}
                  onChange={(e) => handleRgbChange('b', e.target.value)}
                  className="w-full h-10 text-center text-sm font-mono border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">B</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
