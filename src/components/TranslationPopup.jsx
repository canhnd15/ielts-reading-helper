import { useEffect, useRef, useState } from 'react'

export default function TranslationPopup({ popup, onSave, onRemoveHighlight, onClose }) {
  const ref = useRef(null)
  const [showVietnamese, setShowVietnamese] = useState(false)

  // Reset Vietnamese toggle when word changes
  useEffect(() => setShowVietnamese(false), [popup?.word])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (!popup) return null

  const popupWidth = 360
  const left = Math.max(8, Math.min(popup.x - popupWidth / 2, window.innerWidth - popupWidth - 8))
  const top = popup.y + 12

  const { data, loading, error, hlId } = popup

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
      style={{ left, top, width: popupWidth }}
    >
      {/* Word header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-xl font-bold text-gray-900">{popup.word}</span>
          {data?.pronunciation && (
            <span className="text-sm text-gray-400 font-mono">{data.pronunciation}</span>
          )}
          {data?.pos && (
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
              {data.pos}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-3 max-h-96 overflow-y-auto">

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
            <span className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
            Looking up in context...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Definition */}
        {data?.definition && (
          <div className="text-sm text-gray-700 leading-relaxed mb-3">
            {data.definition}
          </div>
        )}

        {/* Examples */}
        {data?.examples?.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Examples
            </div>
            <ul className="space-y-1.5">
              {data.examples.map((ex, i) => (
                <li key={i} className="text-xs text-gray-600 italic leading-relaxed pl-3 border-l-2 border-gray-200">
                  {ex}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Vietnamese toggle */}
        {data && (
          <div className="mt-1">
            {showVietnamese ? (
              <div className="text-sm font-medium text-blue-700 bg-blue-50 rounded-lg px-3 py-2">
                🇻🇳 {data.vietnamese}
              </div>
            ) : (
              <button
                onClick={() => setShowVietnamese(true)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Show Vietnamese translation
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={onSave}
          disabled={loading || !data}
          className="flex-1 py-1.5 text-sm font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save to Vocabulary
        </button>
        {hlId && (
          <button
            onClick={() => { onRemoveHighlight(hlId); onClose() }}
            className="px-3 py-1.5 text-sm text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
            title="Remove highlight"
          >
            Remove highlight
          </button>
        )}
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
