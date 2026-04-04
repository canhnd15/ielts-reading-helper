import { useState, useEffect, useRef } from 'react'

/**
 * Dual-mode modal: add a new passage or edit an existing one.
 * mode='add' → calls onAdd(title, text, topicId)
 * mode='edit' → calls onEdit(title, text, topicId), initialValues pre-fills fields
 */
export default function AddPassageModal({
  open, topics, mode = 'add', initialValues = null,
  onAdd, onEdit, onAddTopic, onClose,
}) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [topicId, setTopicId] = useState('')
  const [newTopicName, setNewTopicName] = useState('')
  const titleRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTitle(initialValues?.title ?? '')
      setText(initialValues?.text ?? '')
      setTopicId(initialValues?.topicId ?? '')
      setNewTopicName('')
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const isNewTopic = topicId === '__new__'

  const handleSubmit = () => {
    if (!text.trim()) return

    let resolvedTopicId = topicId || null
    if (isNewTopic) {
      resolvedTopicId = newTopicName.trim() ? onAddTopic(newTopicName.trim()) : null
    }

    if (mode === 'edit') onEdit(title, text, resolvedTopicId)
    else onAdd(title, text, resolvedTopicId)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {mode === 'edit' ? 'Edit Passage' : 'Add IELTS Passage'}
        </h2>

        <input
          ref={titleRef}
          type="text"
          placeholder="Title (e.g. Reading Test 1 – Passage 1)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white text-gray-800"
        />

        <div className="mt-3 flex gap-2">
          <select
            value={topicId}
            onChange={e => setTopicId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 bg-white text-gray-700"
          >
            <option value="">No topic</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
            <option value="__new__">+ Create new topic…</option>
          </select>

          {isNewTopic && (
            <input
              type="text"
              placeholder="Topic name"
              value={newTopicName}
              onChange={e => setNewTopicName(e.target.value)}
              autoFocus
              className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm outline-none focus:border-blue-400 bg-white text-gray-800"
            />
          )}
        </div>

        <textarea
          placeholder="Paste your IELTS reading passage here..."
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full mt-3 px-3 py-2 h-48 border border-gray-200 rounded-lg text-sm resize-none outline-none focus:border-blue-400 leading-relaxed"
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="px-5 py-2 text-sm font-medium bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mode === 'edit' ? 'Save Changes' : 'Add Passage'}
          </button>
        </div>
      </div>
    </div>
  )
}
