import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MD_COMPONENTS = {
  h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mt-6 mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold text-gray-800 mt-5 mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-gray-800 mt-4 mb-1">{children}</h3>,
  p:  ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  u: ({ children }) => <u className="underline">{children}</u>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-500 my-3">{children}</blockquote>
  ),
  code: ({ inline, children }) =>
    inline
      ? <code className="bg-gray-100 rounded px-1 text-sm font-mono text-gray-700">{children}</code>
      : <pre className="bg-gray-100 rounded-lg p-3 my-3 text-sm font-mono overflow-x-auto"><code>{children}</code></pre>,
  hr: () => <hr className="my-4 border-gray-200" />,
  table: ({ children }) => <table className="w-full border-collapse my-3 text-sm">{children}</table>,
  th: ({ children }) => <th className="border border-gray-300 px-3 py-1.5 bg-gray-50 font-semibold text-left">{children}</th>,
  td: ({ children }) => <td className="border border-gray-300 px-3 py-1.5">{children}</td>,
}

function MarkdownPreview({ content, fontSize }) {
  return (
    <div className="passage-text text-gray-800" style={{ fontSize }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

const DEFAULT_ANNOTATION_FONT_SIZE = 13

const ANNOTATION_COLORS = [
  { name: 'black',  value: '#1f2937' },
  { name: 'yellow', value: '#d97706' },
  { name: 'blue',   value: '#2563eb' },
  { name: 'green',  value: '#16a34a' },
  { name: 'red',    value: '#dc2626' },
]

function Annotation({ ann, onChange, onBlur, onDelete, onDragStart, onFontSizeChange, onColorChange }) {
  return (
    <div
      className="exam-annotation absolute group"
      style={{ left: ann.x, top: ann.y, zIndex: 10 }}
    >
      {/* Toolbar — floats above, doesn't push textarea down */}
      <div
        className="absolute flex items-center gap-0.5 cursor-move select-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
        onMouseDown={e => onDragStart(ann.id, e)}
        onClick={e => e.stopPropagation()}
        style={{ bottom: '100%', left: 0, paddingBottom: 2 }}
      >
        <span className="text-gray-300 text-xs mr-1">⠿</span>
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={e => { e.stopPropagation(); onFontSizeChange(ann.id, -1) }}
          className="text-gray-300 hover:text-gray-600 text-xs px-0.5 leading-none"
          tabIndex={-1}
        >A-</button>
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={e => { e.stopPropagation(); onFontSizeChange(ann.id, +1) }}
          className="text-gray-300 hover:text-gray-600 text-xs px-0.5 leading-none"
          tabIndex={-1}
        >A+</button>
        <span className="w-px h-3 bg-gray-200 mx-0.5" />
        {ANNOTATION_COLORS.map(c => (
          <button
            key={c.name}
            onMouseDown={e => e.preventDefault()}
            onClick={e => { e.stopPropagation(); onColorChange(ann.id, c.value) }}
            tabIndex={-1}
            title={c.name}
            style={{ backgroundColor: c.value }}
            className={`w-3 h-3 rounded-full transition-transform hover:scale-125 ${ann.color === c.value ? 'ring-1 ring-offset-1 ring-gray-400' : ''}`}
          />
        ))}
        <button
          onMouseDown={e => { e.preventDefault(); onDelete(ann.id) }}
          className="text-gray-300 hover:text-red-500 text-xs px-0.5 leading-none ml-0.5"
          tabIndex={-1}
        >×</button>
      </div>

      {/* Auto-expanding textarea via CSS grid mirror trick */}
      <div
        style={{ display: 'inline-grid', minWidth: 40 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Hidden mirror to drive width/height */}
        <span
          aria-hidden
          style={{
            gridArea: '1/1',
            visibility: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: ann.fontSize,
            lineHeight: 1.5,
            padding: '1px 2px',
          }}
        >{ann.text + ' '}</span>

        <textarea
          id={`annotation-${ann.id}`}
          value={ann.text}
          onChange={e => onChange(ann.id, e.target.value)}
          onBlur={e => onBlur(ann.id, e.target.value)}
          className="bg-transparent border-none resize-none outline-none"
          style={{
            gridArea: '1/1',
            fontSize: ann.fontSize,
            lineHeight: 1.5,
            padding: '1px 2px',
            overflow: 'hidden',
            minWidth: 40,
            color: ann.color,
          }}
          onClick={e => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

export default function QuestionsSection({ passage, onUpdate, onSaveExamNotes, fontSize, readOnly = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [annotations, setAnnotations] = useState(() => passage?.examNotes ?? [])
  const textareaRef = useRef(null)
  const containerRef = useRef(null)
  const draggingRef = useRef(null)
  const content = passage?.questions ?? ''

  // Sync annotations when passage changes (e.g. user switches passage)
  useEffect(() => {
    setAnnotations(passage?.examNotes ?? [])
  }, [passage?.id])

  function startEdit() {
    setDraft(content)
    setEditing(true)
  }

  function save() {
    onUpdate(passage.id, draft)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
    setDraft('')
  }

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  // --- drag ---
  const handleDragMove = useCallback((e) => {
    const d = draggingRef.current
    if (!d) return
    const dx = e.clientX - d.startMouseX
    const dy = e.clientY - d.startMouseY
    setAnnotations(prev => prev.map(a =>
      a.id === d.id ? { ...a, x: d.startAnnX + dx, y: d.startAnnY + dy } : a
    ))
  }, [])

  const handleDragEnd = useCallback(() => {
    draggingRef.current = null
    window.removeEventListener('mousemove', handleDragMove)
    window.removeEventListener('mouseup', handleDragEnd)
    // Save final position after drag ends
    setAnnotations(prev => {
      onSaveExamNotes?.(passage?.id, prev)
      return prev
    })
  }, [handleDragMove, onSaveExamNotes, passage?.id])

  function handleDragStart(id, e) {
    e.stopPropagation()
    e.preventDefault()
    const ann = annotations.find(a => a.id === id)
    draggingRef.current = {
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startAnnX: ann.x,
      startAnnY: ann.y,
    }
    window.addEventListener('mousemove', handleDragMove)
    window.addEventListener('mouseup', handleDragEnd)
  }

  // Clean up drag listeners on unmount
  useEffect(() => () => {
    window.removeEventListener('mousemove', handleDragMove)
    window.removeEventListener('mouseup', handleDragEnd)
  }, [handleDragMove, handleDragEnd])

  // --- annotation CRUD ---
  function saveAnnotations(next) {
    setAnnotations(next)
    onSaveExamNotes?.(passage.id, next)
  }

  function handleContainerClick(e) {
    if (e.target.closest('.exam-annotation')) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    const next = [...annotations, { id, x, y, text: '', fontSize: DEFAULT_ANNOTATION_FONT_SIZE, color: ANNOTATION_COLORS[0].value }]
    saveAnnotations(next)
    requestAnimationFrame(() => document.getElementById(`annotation-${id}`)?.focus())
  }

  function handleAnnotationBlur(id, text) {
    if (!text.trim()) {
      const next = annotations.filter(a => a.id !== id)
      saveAnnotations(next)
    }
  }

  function handleAnnotationChange(id, text) {
    const next = annotations.map(a => a.id === id ? { ...a, text } : a)
    saveAnnotations(next)
  }

  function deleteAnnotation(id) {
    const next = annotations.filter(a => a.id !== id)
    saveAnnotations(next)
  }

  function changeFontSize(id, delta) {
    const next = annotations.map(a =>
      a.id === id ? { ...a, fontSize: Math.min(24, Math.max(10, a.fontSize + delta)) } : a
    )
    saveAnnotations(next)
  }

  function changeColor(id, color) {
    const next = annotations.map(a => a.id === id ? { ...a, color } : a)
    saveAnnotations(next)
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 mb-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 max-w-2xl">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Questions</h2>
        {!readOnly && (
          !editing ? (
            <button
              onClick={startEdit}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded text-gray-500 hover:text-blue-600 hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={cancel}
                className="text-xs px-2.5 py-1 border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          )
        )}
      </div>

      {editing ? (
        <div className="flex gap-4 border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Markdown</span>
              <span className="text-xs text-gray-300">— **bold**, *italic*, # Heading, - list</span>
            </div>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={"**1.** What is the main argument of the passage?\n\n**2.** True / False / Not Given:\n- The author supports…"}
              className="flex-1 w-full px-4 py-3 font-mono text-sm text-gray-800 bg-white outline-none resize-none leading-relaxed"
              style={{ minHeight: '400px' }}
            />
          </div>
          <div className="w-px bg-gray-200 flex-shrink-0" />
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
              <span className="text-xs text-gray-400 font-medium">Preview</span>
            </div>
            <div className="flex-1 px-4 py-3 overflow-y-auto" style={{ minHeight: '400px' }}>
              {draft
                ? <MarkdownPreview content={draft} fontSize={fontSize} />
                : <p className="text-sm text-gray-300 italic">Preview will appear here…</p>
              }
            </div>
          </div>
        </div>
      ) : readOnly ? (
        <div className="max-w-2xl">
          <p className="text-xs text-gray-300 italic mb-2">Click anywhere to add a note</p>
          <div
            ref={containerRef}
            onClick={handleContainerClick}
            className="relative cursor-text"
          >
            {content ? (
              <MarkdownPreview content={content} fontSize={fontSize} />
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No questions added for this passage.</p>
            )}

            {annotations.map(ann => (
              <Annotation
                key={ann.id}
                ann={ann}
                onChange={handleAnnotationChange}
                onBlur={handleAnnotationBlur}
                onDelete={deleteAnnotation}
                onDragStart={handleDragStart}
                onFontSizeChange={changeFontSize}
                onColorChange={changeColor}
              />
            ))}
          </div>
        </div>
      ) : content ? (
        <div className="max-w-2xl">
          <MarkdownPreview content={content} fontSize={fontSize} />
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="w-full max-w-2xl py-8 text-sm text-gray-300 border border-dashed border-gray-200 rounded-lg hover:border-blue-300 hover:text-blue-400 transition-colors"
        >
          + Add questions for this passage
        </button>
      )}
    </div>
  )
}
