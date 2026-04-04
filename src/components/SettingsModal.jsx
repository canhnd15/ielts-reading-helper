import { useState, useEffect } from 'react'

export default function SettingsModal({ open, apiKey, onSave, onClose }) {
  const [key, setKey] = useState(apiKey)
  const [show, setShow] = useState(false)

  useEffect(() => { if (open) setKey(apiKey) }, [open, apiKey])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Settings</h2>
        <p className="text-sm text-gray-500 mb-5">
          Your API key is stored locally in your browser only.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Google Gemini API Key
        </label>
        <div className="flex gap-2">
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="AIza..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:border-blue-400"
          />
          <button
            onClick={() => setShow(v => !v)}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Free — get your key at{' '}
          <span className="text-blue-500 font-medium">aistudio.google.com</span>
          {' '}→ Get API key. Uses gemini-2.0-flash-lite (free tier).
        </p>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => { onSave(key.trim()); onClose() }}
            className="px-5 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
