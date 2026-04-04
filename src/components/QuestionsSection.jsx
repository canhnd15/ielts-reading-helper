import { useState, useRef, useEffect } from 'react'
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

export default function QuestionsSection({ passage, onUpdate, fontSize, readOnly = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const textareaRef = useRef(null)
  const content = passage?.questions ?? ''

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

  // Focus textarea when edit mode opens
  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

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
        /* Split-pane: editor left, live preview right */
        <div className="flex gap-4 border border-gray-200 rounded-lg overflow-hidden">
          {/* Editor pane */}
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

          {/* Divider */}
          <div className="w-px bg-gray-200 flex-shrink-0" />

          {/* Preview pane */}
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
      ) : content ? (
        <div className="max-w-2xl">
          <MarkdownPreview content={content} fontSize={fontSize} />
        </div>
      ) : readOnly ? (
        <p className="text-sm text-gray-400 text-center py-8">No questions added for this passage.</p>
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
