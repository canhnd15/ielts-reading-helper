import { useRef, useCallback } from 'react'

/**
 * Renders passage text with highlights.
 * - Click a word → translate (passes hlId if inside a highlight)
 * - Select text → highlight toolbar
 * - Click a highlighted word shows "Remove highlight" in the translation popup
 */
export default function PassageText({ passage, onWordClick, onTextSelect }) {
  const containerRef = useRef(null)

  const handleMouseUp = useCallback((e) => {
    const sel = window.getSelection()

    // Text selected → highlight toolbar
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      const container = containerRef.current
      if (!container) return

      const range = sel.getRangeAt(0)
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return

      const start = getOffset(container, range.startContainer, range.startOffset)
      const end = getOffset(container, range.endContainer, range.endOffset)
      if (start < end) {
        const rect = range.getBoundingClientRect()
        onTextSelect({ start, end, x: rect.left + rect.width / 2, y: rect.top })
      }
      return
    }

    // Word click → translation
    // Also detect if the word is inside a highlight so the popup can offer removal
    const wordEl = e.target.closest('[data-word]')
    if (wordEl) {
      const markEl = wordEl.closest('mark[data-hl-id]')
      const hlId = markEl?.dataset.hlId ?? null
      const rect = wordEl.getBoundingClientRect()
      onWordClick(wordEl.dataset.word, rect.left + rect.width / 2, rect.bottom, hlId)
    }
  }, [onWordClick, onTextSelect])

  const rendered = buildHtml(passage.text, passage.highlights)

  return (
    <div
      ref={containerRef}
      className="passage-text"
      onMouseUp={handleMouseUp}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  )
}

// ── helpers ──────────────────────────────────────────────────

function getOffset(container, node, offset) {
  const range = document.createRange()
  range.selectNodeContents(container)
  range.setEnd(node, offset)
  return range.toString().length
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildHtml(text, highlights) {
  const sorted = [...(highlights ?? [])].sort((a, b) => a.start - b.start)

  const segments = []
  let pos = 0

  for (const hl of sorted) {
    const s = Math.max(hl.start, pos)
    if (s > pos) segments.push({ text: text.slice(pos, s), hlId: null, color: null })
    if (s < hl.end) segments.push({ text: text.slice(s, hl.end), hlId: hl.id, color: hl.color })
    pos = hl.end
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), hlId: null, color: null })

  return segments.map(({ text: seg, hlId, color }) => {
    const inner = wrapWords(seg)
    return hlId
      ? `<mark class="hl-${color}" data-hl-id="${hlId}" title="Click a word to translate or remove this highlight">${inner}</mark>`
      : inner
  }).join('')
}

function wrapWords(text) {
  return text.replace(/([a-zA-Z''-]+)/g, word => {
    const clean = word.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '')
    if (!clean) return escHtml(word)
    return `<span class="word-token" data-word="${escHtml(clean)}">${escHtml(word)}</span>`
  })
}
