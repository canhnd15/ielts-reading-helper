import { useState, useMemo } from 'react'
import { applyReview, isDue } from '../utils/sm2'

const RATINGS = [
  { label: 'Again', quality: 0, color: 'bg-red-900 hover:bg-red-800 text-red-200' },
  { label: 'Hard',  quality: 1, color: 'bg-orange-900 hover:bg-orange-800 text-orange-200' },
  { label: 'Good',  quality: 2, color: 'bg-blue-900 hover:bg-blue-800 text-blue-200' },
  { label: 'Easy',  quality: 3, color: 'bg-green-900 hover:bg-green-800 text-green-200' },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getContext(text, start, end) {
  const before = text.lastIndexOf(' ', Math.max(0, start - 120))
  const after = text.indexOf(' ', Math.min(text.length, end + 120))
  const ctxStart = before === -1 ? 0 : before + 1
  const ctxEnd = after === -1 ? text.length : after
  const prefix = ctxStart > 0 ? '…' : ''
  const suffix = ctxEnd < text.length ? '…' : ''
  return prefix + text.slice(ctxStart, ctxEnd) + suffix
}

export default function LearningMode({ passage, onClose, onReviewVocab, onReviewHighlight, onAddSentence }) {
  // Snapshot cards at session start so reviews mid-session don't change the deck
  const cards = useMemo(() => shuffle([
    ...(passage.vocabulary ?? []).filter(isDue).map(v => ({ type: 'vocab', item: v })),
    ...(passage.highlights ?? []).filter(isDue).map(h => ({ type: 'highlight', item: h })),
  ]), []) // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [sentence, setSentence] = useState('')
  const [savedThisCard, setSavedThisCard] = useState(false)
  const [blockMsg, setBlockMsg] = useState('')

  if (cards.length === 0) return <EmptyScreen onClose={onClose} />
  if (index >= cards.length) return <DoneScreen total={cards.length} onClose={onClose} />

  const card = cards[index]
  const isVocab = card.type === 'vocab'
  const sentenceCount = (card.item.sentences ?? []).length

  const handleSaveSentence = () => {
    if (!sentence.trim()) return
    onAddSentence(passage.id, card.item.id, sentence.trim())
    setSentence('')
    setSavedThisCard(true)
    setBlockMsg('')
  }

  const handleRate = (quality) => {
    // Block Good/Easy for vocab cards unless at least one sentence has been written
    if (isVocab && quality >= 2 && !savedThisCard && sentenceCount < 3) {
      setBlockMsg('Write at least one sentence to rate Good or Easy.')
      return
    }
    const srUpdate = applyReview(card.item, quality)
    if (isVocab) onReviewVocab(passage.id, card.item.id, srUpdate)
    else onReviewHighlight(passage.id, card.item.id, srUpdate)

    setIndex(i => i + 1)
    setFlipped(false)
    setSentence('')
    setSavedThisCard(false)
    setBlockMsg('')
  }

  const progress = (index / cards.length) * 100

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col">

      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <span className="text-white font-semibold text-sm">Study Session — {passage.title}</span>
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
          <div
            className="h-1.5 bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-gray-400 text-sm tabular-nums">{index}/{cards.length}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
      </div>

      {/* Card area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-xl">

          {/* Type badge */}
          <div className="text-center mb-5">
            <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full ${
              isVocab ? 'bg-blue-900/60 text-blue-300' : 'bg-yellow-900/60 text-yellow-300'
            }`}>
              {isVocab ? 'Vocabulary' : 'Highlight'}
            </span>
          </div>

          {/* Card */}
          <div className="bg-gray-800 rounded-2xl p-8">
            {isVocab ? <VocabFront item={card.item} /> : <HighlightFront item={card.item} passage={passage} />}

            {flipped && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                {isVocab
                  ? <VocabBack item={card.item} />
                  : <HighlightBack item={card.item} passage={passage} />
                }
              </div>
            )}
          </div>

          {/* Show answer button */}
          {!flipped && (
            <button
              onClick={() => setFlipped(true)}
              className="mt-5 w-full py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
            >
              Show Answer
            </button>
          )}

          {/* After flip */}
          {flipped && (
            <>
              {/* Sentence writing (vocab only) */}
              {isVocab && (
                <div className="mt-5 bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-200 font-medium">
                      Write a sentence using &ldquo;{card.item.word}&rdquo;
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      sentenceCount >= 3
                        ? 'bg-green-900 text-green-300'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {sentenceCount}/3 {sentenceCount >= 3 ? '✓' : ''}
                    </span>
                  </div>

                  {/* Previous sentences */}
                  {(card.item.sentences ?? []).length > 0 && (
                    <ul className="mb-3 space-y-1">
                      {card.item.sentences.map((s, i) => (
                        <li key={i} className="text-xs text-gray-400 italic pl-3 border-l-2 border-gray-600">
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}

                  {savedThisCard ? (
                    <p className="text-green-400 text-sm">✓ Sentence saved!</p>
                  ) : (
                    <div className="flex gap-2">
                      <textarea
                        value={sentence}
                        onChange={e => setSentence(e.target.value)}
                        placeholder={`Use "${card.item.word}" in a sentence…`}
                        rows={2}
                        className="flex-1 bg-gray-700 text-white text-sm px-3 py-2 rounded-lg resize-none outline-none focus:ring-1 focus:ring-blue-500"
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSaveSentence())}
                      />
                      <button
                        onClick={handleSaveSentence}
                        disabled={!sentence.trim()}
                        className="px-3 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 self-end"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {sentenceCount < 3 && !savedThisCard && (
                    <p className="mt-2 text-xs text-amber-500">
                      You need {3 - sentenceCount} more sentence{3 - sentenceCount > 1 ? 's' : ''} to master this word.
                    </p>
                  )}
                </div>
              )}

              {/* Block message */}
              {blockMsg && (
                <p className="mt-3 text-amber-400 text-sm text-center">{blockMsg}</p>
              )}

              {/* Rating buttons */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {RATINGS.map(({ label, quality, color }) => (
                  <button
                    key={quality}
                    onClick={() => handleRate(quality)}
                    className={`py-3 rounded-xl text-sm font-semibold transition-colors ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-600 text-center">
                Again · Hard · Good · Easy — rates how well you recalled it
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Card faces ────────────────────────────────────────────────

function VocabFront({ item }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-white">{item.word}</div>
      {item.pronunciation && (
        <div className="text-gray-400 font-mono mt-2 text-lg">{item.pronunciation}</div>
      )}
      <div className="text-gray-600 text-sm mt-4 italic">What does this word mean?</div>
    </div>
  )
}

function VocabBack({ item }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {item.pos && (
          <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">{item.pos}</span>
        )}
      </div>
      {item.definition && (
        <p className="text-gray-200 text-sm leading-relaxed">{item.definition}</p>
      )}
      {item.examples?.length > 0 && (
        <ul className="space-y-1.5 mt-2">
          {item.examples.map((ex, i) => (
            <li key={i} className="text-xs text-gray-400 italic pl-3 border-l-2 border-gray-600 leading-relaxed">
              {ex}
            </li>
          ))}
        </ul>
      )}
      {item.vietnamese && (
        <div className="text-blue-400 text-sm font-medium mt-2">🇻🇳 {item.vietnamese}</div>
      )}
    </div>
  )
}

function HighlightFront({ item, passage }) {
  const text = passage.text.slice(item.start, item.end)
  const display = text.length > 120 ? text.slice(0, 120) + '…' : text
  return (
    <div className="text-center">
      <div className="text-gray-300 italic text-lg leading-relaxed">&ldquo;{display}&rdquo;</div>
      <div className="text-gray-600 text-sm mt-4 italic">What is the context around this passage?</div>
    </div>
  )
}

function HighlightBack({ item, passage }) {
  const context = getContext(passage.text, item.start, item.end)
  const highlighted = passage.text.slice(item.start, item.end)
  const parts = context.split(highlighted)
  return (
    <div className="text-gray-300 text-sm leading-relaxed">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <mark className={`hl-${item.color} text-gray-900 px-0.5 rounded`}>{highlighted}</mark>
          )}
        </span>
      ))}
    </div>
  )
}

// ── End screens ───────────────────────────────────────────────

function DoneScreen({ total, onClose }) {
  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center gap-4">
      <div className="text-6xl">🎉</div>
      <h2 className="text-2xl font-bold text-white">Session Complete!</h2>
      <p className="text-gray-400">You reviewed {total} item{total > 1 ? 's' : ''}.</p>
      <button
        onClick={onClose}
        className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
      >
        Back to Reading
      </button>
    </div>
  )
}

function EmptyScreen({ onClose }) {
  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center gap-4">
      <div className="text-6xl">✅</div>
      <h2 className="text-2xl font-bold text-white">All caught up!</h2>
      <p className="text-gray-400">No items due for review in this passage.</p>
      <button
        onClick={onClose}
        className="mt-4 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
      >
        Back to Reading
      </button>
    </div>
  )
}
