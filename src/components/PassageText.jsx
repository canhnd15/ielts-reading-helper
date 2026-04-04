import { useRef, useCallback } from 'react'

/**
 * Renders passage text with highlights and annotations.
 * - Click a word → translate (passes hlId if inside a highlight)
 * - Click an annotated word → onAnnotationClick(annId, note, x, y)
 * - Select text → selection toolbar
 */
export default function PassageText({ passage, onWordClick, onTextSelect, onAnnotationClick }) {
  const containerRef = useRef(null)

  const handleMouseUp = useCallback((e) => {
    const sel = window.getSelection()

    // Text selected → toolbar
    if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
      const container = containerRef.current
      if (!container) return

      const range = sel.getRangeAt(0)
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return

      const start = getOffset(container, range.startContainer, range.startOffset)
      const end   = getOffset(container, range.endContainer, range.endOffset)
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

  const rendered = buildHtml(passage.text, passage.highlights, passage.annotations)

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
    .replace(/"/g, '&quot;')
}

function buildHtml(text, highlights, annotations) {
  // Collect all boundary points from highlights and annotations
  const points = new Set([0, text.length])
  for (const h of (highlights ?? []))   { points.add(h.start); points.add(h.end) }
  for (const a of (annotations ?? []))  { points.add(a.start); points.add(a.end) }

  const sorted = [...points].sort((a, b) => a - b)

  return sorted.slice(0, -1).map((start, i) => {
    const end = sorted[i + 1]
    const seg = text.slice(start, end)

    const hl  = (highlights  ?? []).find(h => h.start <= start && h.end >= end)
    const ann = (annotations ?? []).find(a => a.start <= start && a.end >= end)

    let inner = wrapWords(seg)

    if (ann) {
      // Append icon only on the last sub-segment of this annotation range
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
