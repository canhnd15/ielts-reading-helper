import { useRef, useCallback, useState, useEffect } from 'react'

/**
 * Renders passage text split into paragraphs with translation slots between them.
 * - Click a word → translate
 * - Click annotation icon → show note
 * - Select text → highlight toolbar
 * - Between paragraphs → editable translation textarea
 */
export default function PassageText({
  passage, onWordClick, onTextSelect, onAnnotationClick,
  onUpdateParagraphNote, showTranslations = true,
}) {
  const containerRef = useRef(null)

  const handleMouseUp = useCallback((e) => {
    // Ignore clicks inside translation slots
    if (e.target.closest('.para-note-slot')) return

    const sel = window.getSelection()

    // Text selected → toolbar
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      const container = containerRef.current
      if (!container) return

      const range = sel.getRangeAt(0)
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return

      // Both endpoints must be inside .para-block elements
      const startBlock = getParaBlock(range.startContainer)
      const endBlock   = getParaBlock(range.endContainer)
      if (!startBlock || !endBlock) return

      const start = getOffset(startBlock, range.startContainer, range.startOffset)
      const end   = getOffset(endBlock, range.endContainer, range.endOffset)
      if (start < end) {
        const rect = range.getBoundingClientRect()
        onTextSelect({ start, end, x: rect.left + rect.width / 2, y: rect.top })
      }
      return
    }

    // Annotation icon click → show note
    const annTrigger = e.target.closest('[data-ann-trigger]')
    if (annTrigger) {
      const rect = annTrigger.getBoundingClientRect()
      onAnnotationClick?.(annTrigger.dataset.annTrigger, annTrigger.dataset.annNote, rect.left + rect.width / 2, rect.bottom)
      return
    }

    // Word click → translation
    const wordEl = e.target.closest('[data-word]')
    if (wordEl) {
      const markEl = wordEl.closest('mark[data-hl-id]')
      const hlId = markEl?.dataset.hlId ?? null
      const rect = wordEl.getBoundingClientRect()
      onWordClick(wordEl.dataset.word, rect.left + rect.width / 2, rect.bottom, hlId)
    }
  }, [onWordClick, onTextSelect, onAnnotationClick])

  // Split text into paragraphs
  const paragraphs = splitParagraphs(passage.text)
  const notes = passage.paragraphNotes ?? {}

  return (
    <div ref={containerRef} className="passage-text" onMouseUp={handleMouseUp}>
      {paragraphs.map((para, i) => (
        <div key={i}>
          <div
            className="para-block"
            data-offset={para.start}
            dangerouslySetInnerHTML={{
              __html: buildParagraphHtml(
                passage.text, para.start, para.end,
                passage.highlights, passage.annotations,
              ),
            }}
          />
          {i < paragraphs.length - 1 && (
            showTranslations
              ? <TranslationSlot
                  value={notes[i] ?? ''}
                  onChange={(val) => onUpdateParagraphNote?.(passage.id, i, val)}
                />
              : <div className="h-5" />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Translation slot ────────────────────────────────────────

function TranslationSlot({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const textareaRef = useRef(null)

  // Sync draft when stored value changes (e.g. passage switch)
  useEffect(() => { setDraft(value) }, [value])

  // Auto-resize + focus when opening
  useEffect(() => {
    if (open && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
      el.focus()
    }
  }, [open])

  function handleSave() {
    onChange(draft)
    setOpen(false)
  }

  function handleCancel() {
    setDraft(value) // revert
    setOpen(false)
  }

  return (
    <div
      className="para-note-slot my-1"
      onMouseDown={e => e.stopPropagation()}
      onMouseUp={e => e.stopPropagation()}
    >
      {open ? (
        <div className="border border-blue-200 rounded-lg bg-blue-50 p-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => {
              setDraft(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Escape') handleCancel() }}
            placeholder="Write translation for this paragraph…"
            rows={2}
            className="w-full px-2 py-1.5 text-sm bg-white border border-blue-200 rounded-lg resize-none outline-none focus:border-blue-400 leading-relaxed text-gray-800 overflow-hidden"
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-xs px-3 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        /* Saved translation — show text with Edit button */
        <div className="flex items-start gap-2 px-2 py-1 rounded-lg bg-blue-50 border border-blue-100">
          <p className="flex-1 text-sm text-blue-800 leading-relaxed">{value}</p>
          <button
            onClick={() => setOpen(true)}
            className="text-xs text-blue-400 hover:text-blue-600 flex-shrink-0 mt-0.5"
          >
            Edit
          </button>
        </div>
      ) : (
        /* No translation yet — small button */
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-gray-300 hover:text-blue-500 border border-dashed border-gray-200 hover:border-blue-300 rounded-lg px-3 py-1 transition-colors"
        >
          + Translation
        </button>
      )}
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────

function getParaBlock(node) {
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node
  return el?.closest('.para-block')
}

function getOffset(paraBlock, node, offset) {
  const baseOffset = parseInt(paraBlock.dataset.offset, 10)

  const range = document.createRange()
  range.selectNodeContents(paraBlock)
  range.setEnd(node, offset)

  const fragment = range.cloneContents()
  fragment.querySelectorAll('.ann-trigger').forEach(el => el.remove())

  return baseOffset + fragment.textContent.length
}

function splitParagraphs(text) {
  const parts = []
  let pos = 0
  // Split on double newlines (paragraph breaks)
  const regex = /\n\s*\n/g
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > pos) {
      parts.push({ start: pos, end: match.index })
    }
    pos = match.index + match[0].length
  }
  if (pos < text.length) {
    parts.push({ start: pos, end: text.length })
  }
  if (parts.length === 0) {
    parts.push({ start: 0, end: text.length })
  }
  return parts
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildParagraphHtml(fullText, paraStart, paraEnd, highlights, annotations) {
  const text = fullText.slice(paraStart, paraEnd)

  // Filter and clip highlights/annotations to this paragraph range, adjusting offsets
  const paraHighlights = (highlights ?? [])
    .filter(h => h.start < paraEnd && h.end > paraStart)
    .map(h => ({
      ...h,
      start: Math.max(h.start, paraStart) - paraStart,
      end:   Math.min(h.end, paraEnd) - paraStart,
    }))

  const paraAnnotations = (annotations ?? [])
    .filter(a => a.start < paraEnd && a.end > paraStart)
    .map(a => ({
      ...a,
      start: Math.max(a.start, paraStart) - paraStart,
      end:   Math.min(a.end, paraEnd) - paraStart,
    }))

  return buildHtml(text, paraHighlights, paraAnnotations)
}

function buildHtml(text, highlights, annotations) {
  const points = new Set([0, text.length])
  for (const h of highlights)  { points.add(h.start); points.add(h.end) }
  for (const a of annotations) { points.add(a.start); points.add(a.end) }

  const sorted = [...points].sort((a, b) => a - b)

  return sorted.slice(0, -1).map((start, i) => {
    const end = sorted[i + 1]
    const seg = text.slice(start, end)

    const hl  = highlights.find(h => h.start <= start && h.end >= end)
    const ann = annotations.find(a => a.start <= start && a.end >= end)

    let inner = wrapWords(seg)

    if (ann) {
      const icon = end === ann.end
        ? `<sup class="ann-trigger" data-ann-trigger="${escHtml(ann.id)}" data-ann-note="${escHtml(ann.note)}" title="View note">✎</sup>`
        : ''
      inner = `<span class="ann-underline">${inner}${icon}</span>`
    }
    if (hl) {
      inner = `<mark class="hl-${hl.color}" data-hl-id="${escHtml(hl.id)}" title="Click a word to translate or remove this highlight">${inner}</mark>`
    }
    return inner
  }).join('')
}

function wrapWords(text) {
  return text.replace(/([a-zA-Z''-]+)/g, word => {
    const clean = word.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '')
    if (!clean) return escHtml(word)
    return `<span class="word-token" data-word="${escHtml(clean)}">${escHtml(word)}</span>`
  })
}
