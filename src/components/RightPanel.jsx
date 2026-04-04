import { useState } from 'react'
import { getDueCount } from '../utils/sm2'

const HL_COLORS = {
  yellow: '#fef08a', green: '#bbf7d0', blue: '#bfdbfe',
  pink: '#fbcfe8', orange: '#fed7aa',
}

const TABS = ['Notes', 'Vocabulary', 'Highlights']

export default function RightPanel({
  passage, onUpdateNotes, onRemoveVocab, onRemoveHighlight,
  onAddSentence, onStartLearning,
}) {
  const [activeTab, setActiveTab] = useState('Notes')
  const dueCount = passage ? getDueCount(passage) : 0

  return (
    <div className="w-80 flex-shrink-0 bg-slate-50 border-l border-gray-200 flex flex-col">

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors
              ${activeTab === tab
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab}
            {tab === 'Vocabulary' && passage?.vocabulary?.length > 0 &&
              <span className="ml-1 bg-blue-100 text-blue-700 rounded-full px-1.5 text-xs">
                {passage.vocabulary.length}
              </span>
            }
            {tab === 'Highlights' && passage?.highlights?.length > 0 &&
              <span className="ml-1 bg-yellow-100 text-yellow-700 rounded-full px-1.5 text-xs">
                {passage.highlights.length}
              </span>
            }
          </button>
        ))}
      </div>

      {/* Review banner */}
      {passage && (
        <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-100">
          <span className="text-xs text-gray-500">
            {dueCount > 0
              ? <span className="text-amber-600 font-medium">{dueCount} item{dueCount > 1 ? 's' : ''} due</span>
              : <span className="text-green-600">All caught up ✓</span>
            }
          </span>
          <button
            onClick={onStartLearning}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              dueCount > 0
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {dueCount > 0 ? `Review (${dueCount})` : 'Review All'}
          </button>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'Notes'      && <NotesTab passage={passage} onUpdateNotes={onUpdateNotes} />}
        {activeTab === 'Vocabulary' && <VocabTab passage={passage} onRemove={onRemoveVocab} onAddSentence={onAddSentence} />}
        {activeTab === 'Highlights' && <HighlightsTab passage={passage} onRemove={onRemoveHighlight} />}
      </div>
    </div>
  )
}

// ── Notes ─────────────────────────────────────────────────────

function NotesTab({ passage, onUpdateNotes }) {
  return (
    <div className="p-3 h-full flex flex-col">
      <textarea
        className="flex-1 w-full min-h-64 p-3 text-sm border border-gray-200 rounded-lg resize-none outline-none focus:border-blue-400 bg-white text-gray-700 leading-relaxed"
        placeholder={passage ? 'Take notes about this passage…' : 'Select a passage to take notes.'}
        disabled={!passage}
        value={passage?.notes ?? ''}
        onChange={e => passage && onUpdateNotes(passage.id, e.target.value)}
      />
      <p className="mt-2 text-xs text-gray-400">Notes are saved automatically</p>
    </div>
  )
}

// ── Vocabulary ────────────────────────────────────────────────

function VocabTab({ passage, onRemove, onAddSentence }) {
  const vocab = passage?.vocabulary ?? []

  if (vocab.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-400 text-center mt-8">
        Click a word while reading to translate and save it here.
      </div>
    )
  }

  return (
    <div className="p-3 space-y-2">
      {vocab.map(v => (
        <VocabItem key={v.id} item={v} passageId={passage.id} onRemove={onRemove} onAddSentence={onAddSentence} />
      ))}
    </div>
  )
}

function VocabItem({ item, passageId, onRemove, onAddSentence }) {
  const [expanded, setExpanded] = useState(false)
  const [sentence, setSentence] = useState('')
  const sentences = item.sentences ?? []
  const mastered = sentences.length >= 3

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 flex items-start gap-2">
        <button className="flex-1 text-left" onClick={() => setExpanded(v => !v)}>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">{item.word}</span>
            {item.pronunciation && (
              <span className="text-xs text-gray-400 font-mono">{item.pronunciation}</span>
            )}
            {item.pos && (
              <span className="text-xs bg-blue-50 text-blue-600 px-1.5 rounded-full">{item.pos}</span>
            )}
          </div>
          {item.definition && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{item.definition}</p>
          )}
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
            mastered
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {sentences.length}/3
          </span>
          <button
            onClick={() => onRemove(passageId, item.id)}
            className="text-gray-300 hover:text-red-400 text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded: Vietnamese + sentences */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 bg-gray-50 border-t border-gray-100">
          {item.vietnamese && (
            <p className="text-xs text-blue-600 font-medium mb-2">🇻🇳 {item.vietnamese}</p>
          )}

          {/* Existing sentences */}
          {sentences.length > 0 && (
            <ul className="space-y-1 mb-2">
              {sentences.map((s, i) => (
                <li key={i} className="text-xs text-gray-600 italic pl-2 border-l-2 border-gray-300">
                  {s}
                </li>
              ))}
            </ul>
          )}

          {/* Add sentence */}
          {!mastered && (
            <>
              <p className="text-xs text-amber-600 mb-1.5">
                Write {3 - sentences.length} more sentence{3 - sentences.length > 1 ? 's' : ''} to master this word
              </p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={sentence}
                  onChange={e => setSentence(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && sentence.trim()) {
                      onAddSentence(passageId, item.id, sentence.trim())
                      setSentence('')
                    }
                  }}
                  placeholder={`Sentence with "${item.word}"…`}
                  className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white text-gray-700"
                />
                <button
                  onClick={() => {
                    if (sentence.trim()) {
                      onAddSentence(passageId, item.id, sentence.trim())
                      setSentence('')
                    }
                  }}
                  disabled={!sentence.trim()}
                  className="px-2 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </>
          )}
          {mastered && (
            <p className="text-xs text-green-600 font-medium">✓ Mastered — 3 sentences written</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Highlights ────────────────────────────────────────────────

function HighlightsTab({ passage, onRemove }) {
  const highlights = passage?.highlights ?? []

  if (highlights.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-400 text-center mt-8">
        Select text in the passage to highlight it.
      </div>
    )
  }

  return (
    <div className="p-3 space-y-2">
      {highlights.map(h => {
        const snippet = passage.text.slice(h.start, h.end)
        const display = snippet.length > 80 ? snippet.slice(0, 80) + '…' : snippet
        return (
          <div
            key={h.id}
            className="rounded-lg px-3 py-2 flex items-start gap-2"
            style={{ background: HL_COLORS[h.color] ?? '#fef9c3' }}
          >
            <span className="flex-1 text-sm text-gray-700">{display}</span>
            <button
              onClick={() => onRemove(h.id)}
              className="text-gray-400 hover:text-red-500 text-xs mt-0.5 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
