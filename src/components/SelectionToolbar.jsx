import { useEffect, useRef } from 'react'

const COLORS = [
  { name: 'yellow', bg: '#fef08a' },
  { name: 'green',  bg: '#bbf7d0' },
  { name: 'blue',   bg: '#bfdbfe' },
  { name: 'pink',   bg: '#fbcfe8' },
  { name: 'orange', bg: '#fed7aa' },
]

export default function SelectionToolbar({ selection, onHighlight, onNote, onClose }) {
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (!selection) return null

  const { x, y } = selection
  const left = Math.max(8, Math.min(x - 100, window.innerWidth - 220))
  const top = y - 52 + window.scrollY

  return (
    <div
      ref={ref}
      className="fixed z-50 flex items-center gap-1.5 bg-gray-900 rounded-xl px-3 py-2 shadow-2xl"
      style={{ left, top }}
    >
      <span className="text-xs text-gray-400 mr-1">Highlight:</span>
      {COLORS.map(c => (
        <button
          key={c.name}
          title={c.name}
          onClick={() => onHighlight(c.name)}
          className="w-5 h-5 rounded-full border-2 border-transparent hover:border-white hover:scale-110 transition-transform"
          style={{ background: c.bg }}
        />
      ))}
      <div className="w-px h-4 bg-gray-700 mx-1" />
      <button
        onClick={onNote}
        className="text-xs px-2 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors whitespace-nowrap"
        title="Add a note to this text"
      >
        📝 Note
      </button>
      <button
        onClick={onClose}
        className="ml-1 text-gray-500 hover:text-white text-xs px-1"
      >
        ✕
      </button>
    </div>
  )
}
